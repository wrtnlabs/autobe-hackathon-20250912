import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";
import { IPageIHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformReminder";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and list reminders with filter, sorting, and pagination
 *
 * Obtain a filtered and paginated list of reminders stored in the platform,
 * filtered by user role and query parameters. The reminders system is
 * responsible for delivering scheduled notifications to users and staff (e.g.,
 * appointment, compliance, medication). This operation enables searching,
 * filtering, and sorting reminders according to criteria such as recipient,
 * status, time window, delivery outcome, and organization context, supporting
 * bulk reminder management or analytics. Authorization is required for any user
 * account able to view reminders in their organization scope; compliance and
 * privacy rules apply.
 *
 * This endpoint operates on the healthcare_platform_reminders table, returning
 * reminder summaries and supporting paging through large volumes of data.
 *
 * @param props - Object with the authenticated system admin and the
 *   search/filter body
 * @param props.systemAdmin - The authenticated system admin
 * @param props.body - Filter, sort, and pagination options for reminders search
 * @returns Paginated result of reminder summary rows and total records
 * @throws {Error} If an unexpected error occurs during retrieval
 */
export async function patchhealthcarePlatformSystemAdminReminders(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformReminder.IRequest;
}): Promise<IPageIHealthcarePlatformReminder.ISummary> {
  const { body } = props;

  // Defaults and number stripping for brand compatibility
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);
  const skip = (page - 1) * limit;

  // Sorting logic: allow only whitelisted fields; default is scheduled_for desc
  let sort: string = body.sort ?? "-scheduled_for";
  let sortField = sort.replace(/^[-+]/, "");
  let sortOrder: "asc" | "desc" = sort.startsWith("-") ? "desc" : "asc";
  const allowedSortFields = [
    "scheduled_for",
    "reminder_type",
    "target_user_id",
    "status",
  ];
  if (!allowedSortFields.includes(sortField)) {
    sortField = "scheduled_for";
    sortOrder = "desc";
  }

  // Build where clause with only available filters
  const where = {
    deleted_at: null,
    ...(body.target_user_id !== undefined &&
      body.target_user_id !== null && { target_user_id: body.target_user_id }),
    ...(body.organization_id !== undefined &&
      body.organization_id !== null && {
        organization_id: body.organization_id,
      }),
    ...(body.reminder_type !== undefined &&
      body.reminder_type !== null &&
      body.reminder_type.length > 0 && {
        reminder_type: { contains: body.reminder_type },
      }),
    ...(body.reminder_message !== undefined &&
      body.reminder_message !== null &&
      body.reminder_message.length > 0 && {
        reminder_message: { contains: body.reminder_message },
      }),
    ...(body.status !== undefined &&
      body.status !== null &&
      body.status.length > 0 && { status: body.status }),
    ...((body.scheduled_for_from !== undefined ||
      body.scheduled_for_to !== undefined) && {
      scheduled_for: {
        ...(body.scheduled_for_from !== undefined &&
          body.scheduled_for_from !== null && { gte: body.scheduled_for_from }),
        ...(body.scheduled_for_to !== undefined &&
          body.scheduled_for_to !== null && { lte: body.scheduled_for_to }),
      },
    }),
    ...((body.delivered_at_from !== undefined ||
      body.delivered_at_to !== undefined) && {
      delivered_at: {
        ...(body.delivered_at_from !== undefined &&
          body.delivered_at_from !== null && { gte: body.delivered_at_from }),
        ...(body.delivered_at_to !== undefined &&
          body.delivered_at_to !== null && { lte: body.delivered_at_to }),
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
          body.acknowledged_at_to !== null && { lte: body.acknowledged_at_to }),
      },
    }),
    ...(body.failure_reason !== undefined &&
      body.failure_reason !== null &&
      body.failure_reason.length > 0 && {
        failure_reason: { contains: body.failure_reason },
      }),
  };

  // Prisma queries (records and count in parallel)
  const [records, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_reminders.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
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
    MyGlobal.prisma.healthcare_platform_reminders.count({
      where,
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((r) => ({
      id: r.id,
      reminder_type: r.reminder_type,
      reminder_message: r.reminder_message,
      scheduled_for: toISOStringSafe(r.scheduled_for),
      status: r.status,
    })),
  };
}
