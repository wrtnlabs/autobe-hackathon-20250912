import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformEmergencyAccessOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEmergencyAccessOverride";
import { IPageIHealthcarePlatformEmergencyAccessOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformEmergencyAccessOverride";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Searches and retrieves a filtered, paginated list of emergency access
 * override records for compliance and audit review.
 *
 * This endpoint allows a system administrator to search all emergency access
 * override (break-the-glass) events across the healthcarePlatform system,
 * supporting advanced filtering (organization, user, reason, scope, date
 * windows, review status), pagination, and sort order for regulatory, legal, or
 * compliance investigation.
 *
 * RBAC: systemAdmin only. Filters and returns all records, subject to query
 * conditions, across the entire platform. All date/datetime values are returned
 * as string & tags.Format<'date-time'>, never native Date.
 *
 * @param props - Props object
 * @param props.systemAdmin - The authenticated SystemadminPayload for this
 *   request
 * @param props.body - The search filters, pagination, and sort options for the
 *   query
 * @returns Paginated list of emergency access override audit records
 * @throws {Error} If an invalid sort field/order is supplied, or on
 *   internal/database errors.
 */
export async function patchhealthcarePlatformSystemAdminEmergencyAccessOverrides(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformEmergencyAccessOverride.IRequest;
}): Promise<IPageIHealthcarePlatformEmergencyAccessOverride> {
  const { body } = props;
  // -- Pagination
  const currentPage = body.page ?? 1;
  const pageSize = body.page_size ?? 20;
  const skip = Number(currentPage - 1) * Number(pageSize);
  const take = Number(pageSize);
  // -- Allowed sort fields only
  const allowedSortFields = [
    "override_start_at",
    "override_end_at",
    "reviewed_at",
    "created_at",
  ];
  const sortField = allowedSortFields.includes(body.sort_by ?? "")
    ? (body.sort_by ?? "override_start_at")
    : "override_start_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  // -- WHERE clause construction (type: Record<string, unknown>)
  const where = {
    deleted_at: null,
    ...(body.organization_id !== undefined &&
      body.organization_id !== null && {
        organization_id: body.organization_id,
      }),
    ...(body.user_id !== undefined &&
      body.user_id !== null && {
        user_id: body.user_id,
      }),
    ...(body.reason !== undefined &&
      body.reason !== null && {
        reason: { contains: body.reason },
      }),
    ...(body.override_scope !== undefined &&
      body.override_scope !== null && {
        override_scope: { contains: body.override_scope },
      }),
    // override_start_at window (gte/lte)
    ...(body.override_start_at_from !== undefined ||
    body.override_start_at_to !== undefined
      ? {
          override_start_at: {
            ...(body.override_start_at_from !== undefined &&
              body.override_start_at_from !== null && {
                gte: body.override_start_at_from,
              }),
            ...(body.override_start_at_to !== undefined &&
              body.override_start_at_to !== null && {
                lte: body.override_start_at_to,
              }),
          },
        }
      : {}),
    // override_end_at window (gte/lte)
    ...(body.override_end_at_from !== undefined ||
    body.override_end_at_to !== undefined
      ? {
          override_end_at: {
            ...(body.override_end_at_from !== undefined &&
              body.override_end_at_from !== null && {
                gte: body.override_end_at_from,
              }),
            ...(body.override_end_at_to !== undefined &&
              body.override_end_at_to !== null && {
                lte: body.override_end_at_to,
              }),
          },
        }
      : {}),
    ...(body.reviewed_by_user_id !== undefined &&
      body.reviewed_by_user_id !== null && {
        reviewed_by_user_id: body.reviewed_by_user_id,
      }),
    // reviewed_at window (gte/lte)
    ...(body.reviewed_at_from !== undefined || body.reviewed_at_to !== undefined
      ? {
          reviewed_at: {
            ...(body.reviewed_at_from !== undefined &&
              body.reviewed_at_from !== null && { gte: body.reviewed_at_from }),
            ...(body.reviewed_at_to !== undefined &&
              body.reviewed_at_to !== null && { lte: body.reviewed_at_to }),
          },
        }
      : {}),
  };

  // -- Parallel query (rows, total)
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_emergency_access_overrides.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take,
    }),
    MyGlobal.prisma.healthcare_platform_emergency_access_overrides.count({
      where,
    }),
  ]);

  // -- Map DB rows to DTO (convert all dates to ISO string)
  const data = rows.map((row) => {
    // reviewed_by_user_id and reviewed_at are optional/nullable fields in DTO
    return {
      id: row.id,
      user_id: row.user_id,
      organization_id: row.organization_id,
      reason: row.reason,
      override_scope: row.override_scope,
      override_start_at: toISOStringSafe(row.override_start_at),
      override_end_at: row.override_end_at
        ? toISOStringSafe(row.override_end_at)
        : null,
      reviewed_by_user_id: row.reviewed_by_user_id ?? undefined,
      reviewed_at: row.reviewed_at
        ? toISOStringSafe(row.reviewed_at)
        : undefined,
      created_at: toISOStringSafe(row.created_at),
    };
  });

  // -- Construct and return paginated response
  return {
    pagination: {
      current: Number(currentPage),
      limit: Number(pageSize),
      records: total,
      pages: Math.ceil(total / Number(pageSize)),
    },
    data,
  };
}
