import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsReport";
import { IPageIHealthcarePlatformAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAnalyticsReport";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and retrieve paginated analytics report records
 * (IHealthcarePlatformAnalyticsReport) with filters and sorting.
 *
 * Retrieves a filtered, paginated list of analytics report definitions to which
 * the user has access, based on search, filter, and sort criteria specified in
 * the request body. Operates on the healthcare_platform_analytics_reports table
 * and is used to provide users with access to analytics configuration,
 * reporting dashboards, and organization/department-scoped reports. The
 * IHealthcarePlatformAnalyticsReport.IRequest request body enables deliberate
 * querying for report name, creator, department, and status, as well as
 * supports pagination and sorting. The results are returned as an
 * IPageIHealthcarePlatformAnalyticsReport, providing all attributes suitable
 * for reporting UIs.
 *
 * Authorization: Any authenticated systemAdmin can access all reports without
 * org or department scoping.
 *
 * @param props - Request properties
 * @param props.systemAdmin - The authenticated system administrator making the
 *   request
 * @param props.body - Search, filter, pagination, and sort configuration for
 *   analytics reports
 * @returns A paginated list of analytics reports matching the query
 */
export async function patchhealthcarePlatformSystemAdminAnalyticsReports(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformAnalyticsReport.IRequest;
}): Promise<IPageIHealthcarePlatformAnalyticsReport> {
  const { body } = props;

  // Pagination defaults & normalization (int32 minimum 1)
  const page = body.page !== undefined && body.page > 0 ? Number(body.page) : 1;
  const limit =
    body.limit !== undefined && body.limit > 0 ? Number(body.limit) : 20;
  const skip = (page - 1) * limit;

  // Allow only specific sort fields, fallback to created_at
  const ALLOWED_SORT_FIELDS = ["created_at", "name", "updated_at", "is_active"];
  const sortField =
    typeof body.sort === "string" && ALLOWED_SORT_FIELDS.includes(body.sort)
      ? body.sort
      : "created_at";
  const sortOrder = body.order === "asc" ? "asc" : "desc";

  // Build where clause with only schema-backed fields
  const where = {
    ...(body.name !== undefined &&
      body.name !== null && {
        // Only use contains for String fields, not for UUID
        name: { contains: body.name },
      }),
    ...(body.created_by_user_id !== undefined &&
      body.created_by_user_id !== null && {
        created_by_user_id: body.created_by_user_id,
      }),
    ...(body.organization_id !== undefined &&
      body.organization_id !== null && {
        organization_id: body.organization_id,
      }),
    ...(body.department_id !== undefined &&
      body.department_id !== null && {
        department_id: body.department_id,
      }),
    ...(body.is_active !== undefined && { is_active: body.is_active }),
  };

  // Query in parallel: data and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_analytics_reports.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.healthcare_platform_analytics_reports.count({ where }),
  ]);

  // Map DB rows to DTO format
  const data = rows.map((row) => ({
    id: row.id,
    created_by_user_id: row.created_by_user_id,
    organization_id: row.organization_id,
    department_id: row.department_id ?? undefined,
    name: row.name,
    description: row.description ?? undefined,
    template_config_json: row.template_config_json,
    is_active: row.is_active,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
  }));

  // Final pagination object, removing any brand types for page/limit
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
