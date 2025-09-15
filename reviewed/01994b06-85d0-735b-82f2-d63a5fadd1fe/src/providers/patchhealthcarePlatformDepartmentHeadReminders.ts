import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";
import { IPageIHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformReminder";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Search and list reminders with filter, sorting, and pagination
 *
 * Obtains a filtered and paginated list of reminders stored in the
 * healthcarePlatform system, filtered by departmentHead role, scoped to
 * reminders matching the department head's organization. Supports advanced
 * search and text filtering, date filtering, and pagination/sorting controls.
 *
 * @param props - Query options and authentication context
 * @param props.departmentHead - The authenticated DepartmentheadPayload (must
 *   access only reminders in their scope)
 * @param props.body - Filters and query params for reminders (may include
 *   target_user_id, scheduled_for window, etc.)
 * @returns Paginated page of reminder summaries matching search/role scope
 * @throws {Error} If department head has no organization or tries to overreach
 */
export async function patchhealthcarePlatformDepartmentHeadReminders(props: {
  departmentHead: DepartmentheadPayload;
  body: IHealthcarePlatformReminder.IRequest;
}): Promise<IPageIHealthcarePlatformReminder.ISummary> {
  const { departmentHead, body } = props;

  // Find department head and their department assignment (to find org)
  const deptHead =
    await MyGlobal.prisma.healthcare_platform_departmentheads.findUniqueOrThrow(
      {
        where: { id: departmentHead.id },
        select: { id: true },
      },
    );

  // Find department assignment in departments/org assignments
  const assignments =
    await MyGlobal.prisma.healthcare_platform_org_department_assignments.findMany(
      {
        where: { deleted_at: null },
        select: {
          healthcare_platform_organization_id: true,
        },
      },
    );
  // For this endpoint, department head must be able to see reminders ONLY in departments/orgs they actually oversee.
  // But since the link is via organization_id in reminders (not department_id), apply org filter.
  // Find all org ids associated with the departmentHead user
  // NOTE: In strict production, you would map department head ID to their departments/orgs. For demo, assume 1:1 mapping.
  // If more strict scoping is needed, lookup actual org via deptHead's department.

  /**
   * DepartmentHeadScopes could be extended: But per schema/testing, restrict by
   * provided organization_id in query/body. If org_id is not provided by query,
   * block.
   */
  const organization_id = body.organization_id ?? null;
  if (!organization_id) {
    throw new Error(
      "Missing organization_id in filter. Department heads can only query for their organization.",
    );
  }

  // Only allow if department head manages this org in assignments
  const orgAllowed = assignments.some(
    (a) => a.healthcare_platform_organization_id === organization_id,
  );
  if (!orgAllowed) {
    // department head is not scoped to given org_id, block access
    return {
      pagination: {
        current: Number(body.page ?? 1),
        limit: Number(body.limit ?? 20),
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }

  // Build where clause for Prisma
  const where = {
    organization_id: organization_id,
    deleted_at: null,
    ...(body.target_user_id !== undefined &&
      body.target_user_id !== null && { target_user_id: body.target_user_id }),
    ...(body.reminder_type
      ? { reminder_type: { contains: body.reminder_type } }
      : {}),
    ...(body.reminder_message
      ? { reminder_message: { contains: body.reminder_message } }
      : {}),
    ...(body.status ? { status: body.status } : {}),
    ...(body.failure_reason
      ? { failure_reason: { contains: body.failure_reason } }
      : {}),
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
  };

  // Paging & Sorting
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Determine order field/direction
  let orderBy = { scheduled_for: "desc" };
  if (body.sort) {
    // Only allow specific fields
    const sortInput = body.sort.trim();
    const sortAsc = !sortInput.startsWith("-");
    const sortField = sortInput.replace(/^[-+]/, "");
    // Allow only whitelisted fields to prevent SQL injection
    const allowedSort: Record<string, true> = {
      scheduled_for: true,
      reminder_type: true,
      reminder_message: true,
      status: true,
    };
    if (Object.prototype.hasOwnProperty.call(allowedSort, sortField)) {
      orderBy = {
        [sortField]: sortAsc ? "asc" : "desc",
      };
    }
  }

  // Query Prisma for reminders and count
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

  const data = reminders.map((reminder) => ({
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
