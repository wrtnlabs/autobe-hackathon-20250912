import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsReport";
import { IPageIHealthcarePlatformAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAnalyticsReport";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and retrieve paginated analytics report records
 * (IHealthcarePlatformAnalyticsReport) with filters and sorting.
 *
 * This endpoint provides organization-admin users a filtered, paginated listing
 * of analytics report definitions (healthcare_platform_analytics_reports)
 * scoped to their own organization. Reports matching query parameters (name,
 * creator, department, active state) are returned. Pagination and sorting are
 * strictly managed; cross-tenant data is never returned. This enforces RBAC and
 * regulatory boundaries between organizations.
 *
 * @param props - Request object
 * @param props.organizationAdmin - Authenticated organizationadmin user payload
 *   (OrganizationadminPayload)
 * @param props.body - Query/filter/sort/pagination request
 *   (IHealthcarePlatformAnalyticsReport.IRequest)
 * @returns Paginated, filtered analytics report listing
 *   (IPageIHealthcarePlatformAnalyticsReport)
 * @throws {Error} If page/limit are invalid or input filter values do not match
 *   constraints.
 */
export async function patchhealthcarePlatformOrganizationAdminAnalyticsReports(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformAnalyticsReport.IRequest;
}): Promise<IPageIHealthcarePlatformAnalyticsReport> {
  const { organizationAdmin, body } = props;
  // --- Validation of pagination ---
  const page =
    body.page !== undefined && body.page !== null && body.page > 0
      ? body.page
      : 1;
  const limit =
    body.limit !== undefined && body.limit !== null && body.limit > 0
      ? body.limit
      : 20;
  if (page <= 0 || limit <= 0) {
    throw new Error(
      "Invalid pagination. page/limit must be positive integers.",
    );
  }
  // --- Enforce org_id scope (RBAC, no cross-org leakage) ---
  const orgId = organizationAdmin.organization_id;
  // If body.organization_id is set and does not match RBAC org, return empty result
  if (
    body.organization_id !== undefined &&
    body.organization_id !== null &&
    body.organization_id !== orgId
  ) {
    return {
      pagination: {
        current: page,
        limit: limit,
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }
  // --- Build query filter (only allowed fields, all nullable/optional match DTO/prisma) ---
  const where: Record<string, any> = {
    organization_id: orgId,
    deleted_at: null, // Only not-soft-deleted
    ...(body.name !== undefined &&
      body.name !== null && {
        name: { contains: body.name },
      }),
    ...(body.created_by_user_id !== undefined &&
      body.created_by_user_id !== null && {
        created_by_user_id: body.created_by_user_id,
      }),
    ...(body.department_id !== undefined &&
      body.department_id !== null && {
        department_id: body.department_id,
      }),
    ...(body.is_active !== undefined &&
      body.is_active !== null && {
        is_active: body.is_active,
      }),
  };
  // --- Sorting field is limited to whitelist, else fallback ---
  const allowedSortFields = ["created_at", "name"];
  const sortField =
    body.sort && allowedSortFields.includes(body.sort)
      ? body.sort
      : "created_at";
  const order: "asc" | "desc" = body.order === "asc" ? "asc" : "desc";
  // --- Data load and count ---
  const [rows, records] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_analytics_reports.findMany({
      where,
      orderBy: { [sortField]: order },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.healthcare_platform_analytics_reports.count({ where }),
  ]);
  // --- Mapping to output type, functional ---
  const data = rows.map((r) => {
    return {
      id: r.id,
      created_by_user_id: r.created_by_user_id,
      organization_id: r.organization_id,
      department_id: r.department_id ?? undefined,
      name: r.name,
      description: r.description ?? undefined,
      template_config_json: r.template_config_json,
      is_active: r.is_active,
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
      ...(r.deleted_at !== null && r.deleted_at !== undefined
        ? { deleted_at: toISOStringSafe(r.deleted_at) }
        : {}),
    };
  });
  // --- Pagination object ---
  const pages = records === 0 ? 0 : Math.ceil(records / limit);
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: records,
      pages: pages,
    },
    data,
  };
}
