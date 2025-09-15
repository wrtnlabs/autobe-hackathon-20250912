import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsDashboard";
import { IPageIHealthcarePlatformAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAnalyticsDashboard";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and retrieve analytics dashboards with advanced filtering and
 * pagination
 *
 * This operation allows organization administrators and analytics users to
 * search for analytics dashboards within their own organization. Supports
 * advanced filtering, ownership, department filtering, visibility, title/text
 * search, date ranges, hard/soft deletes, pagination, and sorting by allowed
 * fields, strictly scoped to the admin's org.
 *
 * @param props - Request parameters
 * @param props.organizationAdmin - The authenticated organization administrator
 * @param props.body - Search filters and pagination options
 * @returns Paginated list of dashboard summary objects matching criteria
 * @throws {Error} When the request attempts to access dashboards outside the
 *   admin's organization
 */
export async function patchhealthcarePlatformOrganizationAdminAnalyticsDashboards(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformAnalyticsDashboard.IRequest;
}): Promise<IPageIHealthcarePlatformAnalyticsDashboard.ISummary> {
  const { organizationAdmin, body } = props;
  const forcedOrgId = organizationAdmin.id;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (Number(page) - 1) * Number(limit);

  const where = {
    organization_id: forcedOrgId,
    ...(body.owner_user_id !== undefined &&
      body.owner_user_id !== null && { owner_user_id: body.owner_user_id }),
    ...(body.department_id !== undefined &&
      body.department_id !== null && { department_id: body.department_id }),
    ...(body.title !== undefined &&
      body.title !== null && { title: { contains: body.title } }),
    ...(body.is_public !== undefined &&
      body.is_public !== null && { is_public: body.is_public }),
    ...((body.created_from !== undefined && body.created_from !== null) ||
    (body.created_to !== undefined && body.created_to !== null)
      ? {
          created_at: {
            ...(body.created_from !== undefined &&
              body.created_from !== null && { gte: body.created_from }),
            ...(body.created_to !== undefined &&
              body.created_to !== null && { lte: body.created_to }),
          },
        }
      : {}),
    ...(body.deleted === true ? { deleted_at: { not: null } } : {}),
    ...(body.deleted === false ? { deleted_at: null } : {}),
  };
  let orderBy: Record<string, "asc" | "desc"> = { created_at: "desc" };
  if (body.sort !== undefined && body.sort !== null) {
    const [field, direction] = body.sort.trim().split(" ");
    const allowed = ["created_at", "updated_at", "title", "is_public"];
    if (field && allowed.includes(field)) {
      orderBy = { [field]: direction === "asc" ? "asc" : "desc" };
    }
  }
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_analytics_dashboards.findMany({
      where,
      orderBy,
      skip,
      take: Number(limit),
    }),
    MyGlobal.prisma.healthcare_platform_analytics_dashboards.count({ where }),
  ]);
  const data = rows.map((row) => ({
    id: row.id,
    title: row.title,
    owner_user_id: row.owner_user_id,
    organization_id: row.organization_id,
    department_id: row.department_id === null ? undefined : row.department_id,
    is_public: row.is_public,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at:
      row.deleted_at === null ? undefined : toISOStringSafe(row.deleted_at),
  }));
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(Number(total) / Number(limit)),
    },
    data,
  };
}
