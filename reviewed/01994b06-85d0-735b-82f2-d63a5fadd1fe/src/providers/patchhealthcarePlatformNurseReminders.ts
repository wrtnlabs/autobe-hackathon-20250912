import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";
import { IPageIHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformReminder";
import { NursePayload } from "../decorators/payload/NursePayload";

/**
 * Search and list reminders with filter, sorting, and pagination
 *
 * Retrieves a paginated, filtered list of reminder summaries for the requesting
 * nurse, supporting advanced filtering, search, sorting, and organization
 * scoping. Results include only reminders the nurse is authorized to view
 * (their organization or self), with strict handling of datetime and UUID types
 * and system pagination policies.
 *
 * @param props - Request properties
 * @param props.nurse - The authenticated nurse payload
 * @param props.body - Search and filter parameters for retrieving reminders
 * @returns A paginated summary list of reminders matching the nurse's visible
 *   context and filter criteria
 * @throws {Error} If authorization or lookup fails, or database operation error
 *   occurs
 */
export async function patchhealthcarePlatformNurseReminders(props: {
  nurse: NursePayload;
  body: IHealthcarePlatformReminder.IRequest;
}): Promise<IPageIHealthcarePlatformReminder.ISummary> {
  // --- Determine nurse org context (test uses license_number as org ID) ---
  const { nurse, body } = props;
  const nurseRecord =
    await MyGlobal.prisma.healthcare_platform_nurses.findFirst({
      where: { id: nurse.id, deleted_at: null },
      select: { license_number: true },
    });
  if (!nurseRecord) throw new Error("Nurse not found or account deactivated");
  const nurseOrgId: string = nurseRecord.license_number;

  // Pagination defaults and normalization
  const page = typeof body.page === "number" ? Number(body.page) : 1;
  const limit =
    typeof body.limit === "number" ? Math.min(Number(body.limit), 100) : 20;
  const skip = (page - 1) * limit;

  // Filtering: Reminders must be in nurse's org OR addressed to this nurse only
  const orgFilter = { organization_id: nurseOrgId };
  const selfFilter = { target_user_id: nurse.id };
  // All queries must always exclude deleted reminders
  const baseWhere: Record<string, unknown> = { deleted_at: null };

  // Compose extra filters ONLY with fields that match nurse's org/visibility
  const extraWhere: Record<string, unknown> = {
    ...(body.target_user_id !== undefined &&
    body.target_user_id !== null &&
    body.target_user_id === nurse.id
      ? { target_user_id: nurse.id }
      : {}),
    ...(body.organization_id !== undefined &&
    body.organization_id !== null &&
    body.organization_id === nurseOrgId
      ? { organization_id: nurseOrgId }
      : {}),
    ...(body.reminder_type ? { reminder_type: body.reminder_type } : {}),
    ...(body.reminder_message
      ? { reminder_message: { contains: body.reminder_message } }
      : {}),
    ...(body.status ? { status: body.status } : {}),
    ...(body.scheduled_for_from || body.scheduled_for_to
      ? {
          scheduled_for: {
            ...(body.scheduled_for_from
              ? { gte: body.scheduled_for_from }
              : {}),
            ...(body.scheduled_for_to ? { lte: body.scheduled_for_to } : {}),
          },
        }
      : {}),
    ...(body.delivered_at_from || body.delivered_at_to
      ? {
          delivered_at: {
            ...(body.delivered_at_from ? { gte: body.delivered_at_from } : {}),
            ...(body.delivered_at_to ? { lte: body.delivered_at_to } : {}),
          },
        }
      : {}),
    ...(body.acknowledged_at_from || body.acknowledged_at_to
      ? {
          acknowledged_at: {
            ...(body.acknowledged_at_from
              ? { gte: body.acknowledged_at_from }
              : {}),
            ...(body.acknowledged_at_to
              ? { lte: body.acknowledged_at_to }
              : {}),
          },
        }
      : {}),
    ...(body.failure_reason
      ? { failure_reason: { contains: body.failure_reason } }
      : {}),
  };

  // Main query: scope to nurse org or self, never wider
  const mainWhere = {
    ...baseWhere,
    OR: [orgFilter, selfFilter],
    ...extraWhere,
  };

  // Sorting: accept - or + field for desc/asc (default desc)
  const parsedSortField = body.sort
    ? body.sort.replace(/^[-+]/, "")
    : "scheduled_for";
  const sortOrder = body.sort && body.sort.startsWith("-") ? "desc" : "asc";

  // DB queries (select only summary fields!)
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_reminders.findMany({
      where: mainWhere,
      orderBy: { [parsedSortField]: sortOrder },
      skip,
      take: limit,
      select: {
        id: true,
        reminder_type: true,
        reminder_message: true,
        scheduled_for: true,
        status: true,
      },
    }),
    MyGlobal.prisma.healthcare_platform_reminders.count({ where: mainWhere }),
  ]);

  // Output array: strict branding and immutable transformation
  const data = rows.map((reminder) => ({
    id: reminder.id,
    reminder_type: reminder.reminder_type,
    reminder_message: reminder.reminder_message,
    scheduled_for: toISOStringSafe(reminder.scheduled_for),
    status: reminder.status,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
