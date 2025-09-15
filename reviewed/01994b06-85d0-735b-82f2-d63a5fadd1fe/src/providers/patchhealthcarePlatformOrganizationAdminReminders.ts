import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";
import { IPageIHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformReminder";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and list reminders with filter, sorting, and pagination
 *
 * Obtains a paginated, filterable list of reminders from the healthcare
 * platform. Supports advanced query, search, and sorting options for
 * organization administrators. Only reminders relevant to the authenticated
 * admin's organization are returned. All filtering, range queries, and sorting
 * behave as described in the API specification. Results are guaranteed to use
 * branded uuid/date types for all IDs and timestamps.
 *
 * @param props - Object containing authentication and query/filter parameters
 * @param props.organizationAdmin - Authenticated organization administrator
 *   context
 * @param props.body - Query/filter parameters for reminders, including search,
 *   date ranges, paging, and sorting.
 * @returns Paginated result set of reminder summaries according to
 *   search/sort/filter criteria
 * @throws {Error} If any database operation fails or invalid access
 */
export async function patchhealthcarePlatformOrganizationAdminReminders(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformReminder.IRequest;
}): Promise<IPageIHealthcarePlatformReminder.ISummary> {
  const { organizationAdmin, body } = props;
  // Ensure correct branded pagination types
  const _page = body.page ?? 1;
  const _limit = body.limit ?? 20;
  // For correct pagination typing
  const page: number = Number(_page);
  const limit: number = Number(_limit);
  // Organization access restriction
  const organization_id = organizationAdmin.id;

  // Dynamic where clause: soft-delete + org context + advanced filters
  const where = {
    deleted_at: null,
    organization_id,
    ...(body.target_user_id !== undefined &&
      body.target_user_id !== null && {
        target_user_id: body.target_user_id,
      }),
    ...(body.reminder_type && {
      reminder_type: { contains: body.reminder_type },
    }),
    ...(body.reminder_message && {
      reminder_message: { contains: body.reminder_message },
    }),
    ...(body.status && {
      status: body.status,
    }),
    ...(body.failure_reason && {
      failure_reason: { contains: body.failure_reason },
    }),
    ...((body.scheduled_for_from !== undefined ||
      body.scheduled_for_to !== undefined) && {
      scheduled_for: {
        ...(body.scheduled_for_from !== undefined &&
          body.scheduled_for_from !== null && {
            gte: body.scheduled_for_from,
          }),
        ...(body.scheduled_for_to !== undefined &&
          body.scheduled_for_to !== null && {
            lte: body.scheduled_for_to,
          }),
      },
    }),
    ...((body.delivered_at_from !== undefined ||
      body.delivered_at_to !== undefined) && {
      delivered_at: {
        ...(body.delivered_at_from !== undefined &&
          body.delivered_at_from !== null && {
            gte: body.delivered_at_from,
          }),
        ...(body.delivered_at_to !== undefined &&
          body.delivered_at_to !== null && {
            lte: body.delivered_at_to,
          }),
      },
    }),
    ...((body.acknowledged_at_from !== undefined ||
      body.acknowledged_at_to !== undefined) && {
      acknowledged_at: {
        ...(body.acknowledged_at_from !== undefined &&
          body.acknowledged_at_from !== null && {
            gte: body.acknowledged_at_from,
          }),
        ...(body.acknowledged_at_to !== undefined &&
          body.acknowledged_at_to !== null && {
            lte: body.acknowledged_at_to,
          }),
      },
    }),
  };

  // Sorting logic: only whitelisted fields and asc/desc
  const allowedSortFields = [
    "scheduled_for",
    "reminder_type",
    "target_user_id",
    "status",
  ];
  let sortField = "scheduled_for";
  let sortOrder: "asc" | "desc" = "desc";
  if (body.sort) {
    if (body.sort.startsWith("-")) {
      sortField = body.sort.slice(1);
      sortOrder = "desc";
    } else if (body.sort.startsWith("+")) {
      sortField = body.sort.slice(1);
      sortOrder = "asc";
    } else {
      sortField = body.sort;
      sortOrder = "asc";
    }
    if (!allowedSortFields.includes(sortField)) {
      sortField = "scheduled_for";
      sortOrder = "desc";
    }
  }

  // Execute query (parallelized: records & count)
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_reminders.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip: (page - 1) * limit,
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

  // Transform results, converting scheduled_for into ISO string with branding
  const data = rows.map((r) => ({
    id: r.id,
    reminder_type: r.reminder_type,
    reminder_message: r.reminder_message,
    scheduled_for: toISOStringSafe(r.scheduled_for),
    status: r.status,
  }));

  // Compute number of pages
  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages,
    },
    data,
  };
}
