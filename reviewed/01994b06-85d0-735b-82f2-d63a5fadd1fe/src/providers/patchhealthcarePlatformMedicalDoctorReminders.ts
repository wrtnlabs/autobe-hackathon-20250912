import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";
import { IPageIHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformReminder";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Search and list reminders with filter, sorting, and pagination
 *
 * Returns a paginated list of reminders accessible to the authenticated medical
 * doctor, filtered and sorted according to the supplied query parameters. Only
 * reminders assigned to the requesting doctor (target_user_id ===
 * medicalDoctor.id) or organization context are visible, enforcing strict
 * access control. Supports advanced filtering, text search on message,
 * scheduled/delivered/acknowledged window, and flexible sorting. For security,
 * attempting to access another user's reminders always yields an empty result.
 * All date fields are converted to ISO8601 string format per API contract.
 *
 * @param props - Request parameters
 * @param props.medicalDoctor - Authenticated medical doctor making the request
 * @param props.body - Search and filter parameters for reminders (recipient,
 *   status, window, etc.)
 * @returns Paginated result set of reminder summaries for the requesting doctor
 */
export async function patchhealthcarePlatformMedicalDoctorReminders(props: {
  medicalDoctor: MedicaldoctorPayload;
  body: IHealthcarePlatformReminder.IRequest;
}): Promise<IPageIHealthcarePlatformReminder.ISummary> {
  const { medicalDoctor, body } = props;

  // If explicitly requesting another user's reminders: forbidden, return empty set
  if (
    body.target_user_id !== undefined &&
    body.target_user_id !== null &&
    body.target_user_id !== medicalDoctor.id
  ) {
    return {
      pagination: {
        current: body.page ?? 1,
        limit: body.limit ?? 20,
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }

  // Pagination parameters
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Strict security: Only allow reminders where target_user_id = self
  const where: Record<string, unknown> = {
    deleted_at: null,
    ...(body.target_user_id !== undefined && body.target_user_id !== null
      ? { target_user_id: medicalDoctor.id }
      : { target_user_id: medicalDoctor.id }),
    ...(body.organization_id !== undefined &&
      body.organization_id !== null && {
        organization_id: body.organization_id,
      }),
    ...(body.reminder_type && { reminder_type: body.reminder_type }),
    ...(body.reminder_message && {
      reminder_message: { contains: body.reminder_message },
    }),
    ...(body.status && { status: body.status }),
    ...(body.scheduled_for_from || body.scheduled_for_to
      ? {
          scheduled_for: {
            ...(body.scheduled_for_from && {
              gte: body.scheduled_for_from,
            }),
            ...(body.scheduled_for_to && { lte: body.scheduled_for_to }),
          },
        }
      : {}),
    ...(body.delivered_at_from || body.delivered_at_to
      ? {
          delivered_at: {
            ...(body.delivered_at_from && {
              gte: body.delivered_at_from,
            }),
            ...(body.delivered_at_to && { lte: body.delivered_at_to }),
          },
        }
      : {}),
    ...(body.acknowledged_at_from || body.acknowledged_at_to
      ? {
          acknowledged_at: {
            ...(body.acknowledged_at_from && {
              gte: body.acknowledged_at_from,
            }),
            ...(body.acknowledged_at_to && { lte: body.acknowledged_at_to }),
          },
        }
      : {}),
    ...(body.failure_reason && {
      failure_reason: { contains: body.failure_reason },
    }),
  };

  // Sorting logic
  let orderBy: { [key: string]: "asc" | "desc" } = { scheduled_for: "desc" };
  if (
    body.sort &&
    typeof body.sort === "string" &&
    body.sort.trim().length > 0
  ) {
    const raw = body.sort;
    const isDesc = raw.startsWith("-");
    const field = raw.replace(/^[-+]/, "");
    // only allow sorting by known fields for safety
    const allowedFields = [
      "scheduled_for",
      "reminder_type",
      "target_user_id",
      "status",
    ];
    if (allowedFields.includes(field)) {
      orderBy = { [field]: isDesc ? "desc" : "asc" };
    }
  }

  // Query for results and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_reminders.findMany({
      where,
      orderBy,
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
    MyGlobal.prisma.healthcare_platform_reminders.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      reminder_type: row.reminder_type,
      reminder_message: row.reminder_message,
      scheduled_for: toISOStringSafe(row.scheduled_for),
      status: row.status,
    })),
  };
}
