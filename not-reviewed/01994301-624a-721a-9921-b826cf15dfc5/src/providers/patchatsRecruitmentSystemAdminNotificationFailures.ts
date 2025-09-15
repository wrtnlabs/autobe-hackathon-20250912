import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentNotificationFailure } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentNotificationFailure";
import { IPageIAtsRecruitmentNotificationFailure } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentNotificationFailure";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and list notification failure logs
 * (ats_recruitment_notification_failures) with pagination and filtering.
 *
 * Retrieves a paginated, filterable, and sortable list of notification delivery
 * failure logs from the ats_recruitment_notification_failures table, enabling
 * system administrators to audit, troubleshoot, and analyze notification
 * failures across the ATS system.
 *
 * Supports advanced filtering on delivery_id, failure_type, failure_message
 * (substring), and occurred_at date range. Pagination and sorting parameters
 * are respected for large datasets. Only authenticated system administrators
 * are permitted to access this operation.
 *
 * @param props - The request payload containing systemAdmin authentication and
 *   search/filter options.
 * @param props.systemAdmin - Authenticated SystemadminPayload (JWT derived).
 * @param props.body - Filtering, pagination, and sorting parameters for search.
 * @returns A paginated list of notification failure log records matching the
 *   provided criteria.
 * @throws {Error} If invalid query parameters cause underlying Prisma errors or
 *   if access is unauthenticated.
 */
export async function patchatsRecruitmentSystemAdminNotificationFailures(props: {
  systemAdmin: SystemadminPayload;
  body: IAtsRecruitmentNotificationFailure.IRequest;
}): Promise<IPageIAtsRecruitmentNotificationFailure> {
  const { body } = props;

  // Pagination defaults
  const page = (body.page ?? 1) > 0 ? (body.page ?? 1) : 1;
  const limit = (body.limit ?? 20) > 0 ? (body.limit ?? 20) : 20;
  const offset = (page - 1) * limit;

  // Determine sort field and order
  // Only known fields allowed: occurred_at, failure_type, created_at, etc.
  // Default to 'occurred_at' if client omits or supplies an unsafe field
  const allowedSortFields = [
    "occurred_at",
    "failure_type",
    "created_at",
    "updated_at",
  ];
  const sortField =
    body.sort && allowedSortFields.includes(body.sort)
      ? body.sort
      : "occurred_at";
  const order = body.order === "asc" ? "asc" : "desc";

  // Build filter conditions
  const where = {
    ...(body.delivery_id !== undefined &&
      body.delivery_id !== null && {
        delivery_id: body.delivery_id,
      }),
    ...(body.failure_type !== undefined &&
      body.failure_type !== null && {
        failure_type: body.failure_type,
      }),
    ...(body.failure_message && {
      failure_message: { contains: body.failure_message },
    }),
    ...((body.from_date !== undefined && body.from_date !== null) ||
    (body.to_date !== undefined && body.to_date !== null)
      ? {
          occurred_at: {
            ...(body.from_date !== undefined &&
              body.from_date !== null && {
                gte: body.from_date,
              }),
            ...(body.to_date !== undefined &&
              body.to_date !== null && {
                lte: body.to_date,
              }),
          },
        }
      : {}),
    deleted_at: null, // Only return non-deleted records
  };

  // Query results and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_notification_failures.findMany({
      where,
      orderBy: { [sortField]: order },
      skip: offset,
      take: limit,
    }),
    MyGlobal.prisma.ats_recruitment_notification_failures.count({ where }),
  ]);

  // Map rows into DTOs (convert dates to strings)
  const data = rows.map((row) => ({
    id: row.id,
    notification_id: row.notification_id,
    // Nullable/optional field handling: undefined if DB null for API consistency
    delivery_id: row.delivery_id === null ? undefined : row.delivery_id,
    failure_type: row.failure_type,
    failure_message: row.failure_message,
    occurred_at: toISOStringSafe(row.occurred_at),
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at:
      row.deleted_at !== null && row.deleted_at !== undefined
        ? toISOStringSafe(row.deleted_at)
        : undefined,
  }));

  // Pagination object according to IPage.IPagination
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / (limit > 0 ? limit : 1)),
    },
    data: data,
  };
}
