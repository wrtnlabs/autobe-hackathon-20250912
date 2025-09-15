import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";
import { IPageIHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformReminder";
import { ReceptionistPayload } from "../decorators/payload/ReceptionistPayload";

/**
 * Search and list reminders with filter, sorting, and pagination
 *
 * Obtain a filtered and paginated list of reminders stored in the platform,
 * restricted to the receptionist user's organization. Filters include user,
 * status, scheduled/delivered/acknowledged date windows, failure reason, and
 * text fields. Supports substring search and pagination with robust type
 * handling, strictly enforcing field existence, null vs. undefined, and correct
 * branding.
 *
 * @param props - Object containing: receptionist: The authenticated
 *   receptionist making the request body: Filter, search, and pagination
 *   parameters
 * @returns Paginated summary result for reminders matching the filters
 * @throws {Error} If receptionist not found, not enrolled, or if an invalid
 *   filter value is provided
 */
export async function patchhealthcarePlatformReceptionistReminders(props: {
  receptionist: ReceptionistPayload;
  body: IHealthcarePlatformReminder.IRequest;
}): Promise<IPageIHealthcarePlatformReminder.ISummary> {
  const { receptionist, body } = props;
  // Step 1: Lookup receptionist's organization via user_org_assignment
  const assignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: receptionist.id,
        role_code: "receptionist",
        deleted_at: null,
        assignment_status: "active",
      },
      select: { healthcare_platform_organization_id: true },
    });
  if (!assignment || !assignment.healthcare_platform_organization_id) {
    throw new Error("Receptionist not enrolled with an organization");
  }
  const organization_id = assignment.healthcare_platform_organization_id;

  // Step 2: Validate incoming filters (business logic, e.g. empty status not allowed)
  if (
    body.status !== undefined &&
    body.status !== null &&
    body.status.trim() === ""
  ) {
    throw new Error("Invalid filter: status cannot be empty");
  }

  // Step 3: Build robust filter object -- only include present fields
  const where: Record<string, unknown> = {
    deleted_at: null,
    organization_id: organization_id,
    ...(body.target_user_id !== undefined &&
      body.target_user_id !== null && { target_user_id: body.target_user_id }),
    ...(body.reminder_type !== undefined &&
      body.reminder_type !== null && {
        reminder_type: { contains: body.reminder_type },
      }),
    ...(body.reminder_message !== undefined &&
      body.reminder_message !== null && {
        reminder_message: { contains: body.reminder_message },
      }),
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.failure_reason !== undefined &&
      body.failure_reason !== null && {
        failure_reason: { contains: body.failure_reason },
      }),
  };

  // Date range filters for scheduled_for
  if (
    body.scheduled_for_from !== undefined &&
    body.scheduled_for_from !== null
  ) {
    (where.scheduled_for ??= {}) as Record<string, string>;
    (where.scheduled_for as Record<string, string>).gte =
      body.scheduled_for_from;
  }
  if (body.scheduled_for_to !== undefined && body.scheduled_for_to !== null) {
    (where.scheduled_for ??= {}) as Record<string, string>;
    (where.scheduled_for as Record<string, string>).lte = body.scheduled_for_to;
  }
  // delivered_at
  if (body.delivered_at_from !== undefined && body.delivered_at_from !== null) {
    (where.delivered_at ??= {}) as Record<string, string>;
    (where.delivered_at as Record<string, string>).gte = body.delivered_at_from;
  }
  if (body.delivered_at_to !== undefined && body.delivered_at_to !== null) {
    (where.delivered_at ??= {}) as Record<string, string>;
    (where.delivered_at as Record<string, string>).lte = body.delivered_at_to;
  }
  // acknowledged_at
  if (
    body.acknowledged_at_from !== undefined &&
    body.acknowledged_at_from !== null
  ) {
    (where.acknowledged_at ??= {}) as Record<string, string>;
    (where.acknowledged_at as Record<string, string>).gte =
      body.acknowledged_at_from;
  }
  if (
    body.acknowledged_at_to !== undefined &&
    body.acknowledged_at_to !== null
  ) {
    (where.acknowledged_at ??= {}) as Record<string, string>;
    (where.acknowledged_at as Record<string, string>).lte =
      body.acknowledged_at_to;
  }

  // Step 4: Pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Step 5: Sorting (handle direction and allowed fields only)
  let orderBy: Record<string, "asc" | "desc"> = { scheduled_for: "desc" };
  if (body.sort !== undefined && body.sort !== null && body.sort.length > 0) {
    const raw = body.sort;
    let field = raw.replace(/^[-+]/, "");
    let direction: "asc" | "desc" = raw.startsWith("-") ? "desc" : "asc";
    // Only allow valid sort fields (matches Prisma model)
    const allowedFields = [
      "scheduled_for",
      "reminder_type",
      "target_user_id",
      "status",
    ];
    if (allowedFields.includes(field)) {
      orderBy = { [field]: direction };
    }
  }

  // Step 6: Query the reminders and total count (selected fields only)
  const [reminders, total] = await Promise.all([
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

  // Step 7: Format and map the results (ensure branding, no as, never use Date type)
  return {
    pagination: {
      current: Number(page), // Strip branding for uint32
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: reminders.map((r) => ({
      id: r.id,
      reminder_type: r.reminder_type,
      reminder_message: r.reminder_message,
      scheduled_for: toISOStringSafe(r.scheduled_for),
      status: r.status,
    })),
  };
}
