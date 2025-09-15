import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsDashboard";
import { IPageIHealthcarePlatformAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAnalyticsDashboard";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and retrieve analytics dashboards with advanced filtering and
 * pagination.
 *
 * This endpoint enables system administrators to query analytics dashboards
 * within the platform, allowing advanced filtering by owner, organization,
 * department, title, visibility, creation date, and soft-deletion status.
 * Supports pagination and field sorting for managing large sets of dashboards.
 * System administrators have global access by default; dashboard access is not
 * restricted by authorization here.
 *
 * @param props - Object containing the authenticated system admin (systemAdmin)
 *   and search request (body)
 * @param props.systemAdmin - The authenticated SystemadminPayload making this
 *   request
 * @param props.body - Search filters, pagination, and sort options according to
 *   IRequest
 * @returns A paginated summary list of analytics dashboards matching all
 *   filters
 * @throws {Error} Throws on unexpected database, input, or backend errors
 */
export async function patchhealthcarePlatformSystemAdminAnalyticsDashboards(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformAnalyticsDashboard.IRequest;
}): Promise<IPageIHealthcarePlatformAnalyticsDashboard.ISummary> {
  const { body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Parse sort criteria
  const defaultSort = { created_at: "desc" as const };
  let orderBy: { [key: string]: "asc" | "desc" } = defaultSort;
  if (
    body.sort &&
    typeof body.sort === "string" &&
    body.sort.trim().length > 0
  ) {
    const sortParts = body.sort.trim().split(/\s+/);
    if (sortParts.length === 2 && ["asc", "desc"].includes(sortParts[1])) {
      orderBy = { [sortParts[0]]: sortParts[1] as "asc" | "desc" };
    } else if (sortParts.length === 1) {
      orderBy = { [sortParts[0]]: "desc" };
    }
  }

  // Build where filter conditionally, skipping unknown/null/empty
  const where: Record<string, unknown> = {
    ...(body.owner_user_id !== undefined &&
      body.owner_user_id !== null && {
        owner_user_id: body.owner_user_id,
      }),
    ...(body.organization_id !== undefined &&
      body.organization_id !== null && {
        organization_id: body.organization_id,
      }),
    ...(body.department_id !== undefined &&
      body.department_id !== null && {
        department_id: body.department_id,
      }),
    ...(body.is_public !== undefined &&
      body.is_public !== null && {
        is_public: body.is_public,
      }),
    ...(body.title !== undefined &&
      body.title !== null &&
      body.title.length > 0 && {
        title: { contains: body.title },
      }),
    ...((body.created_from !== undefined && body.created_from !== null) ||
    (body.created_to !== undefined && body.created_to !== null)
      ? {
          created_at: {
            ...(body.created_from !== undefined &&
              body.created_from !== null && {
                gte: body.created_from,
              }),
            ...(body.created_to !== undefined &&
              body.created_to !== null && {
                lte: body.created_to,
              }),
          },
        }
      : {}),
    ...(body.deleted === true && { deleted_at: { not: null } }),
    ...(body.deleted === false && { deleted_at: null }),
  };

  // Query results and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_analytics_dashboards.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        owner_user_id: true,
        organization_id: true,
        department_id: true,
        is_public: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.healthcare_platform_analytics_dashboards.count({ where }),
  ]);

  // Map result rows to ISummary list
  const data = rows.map((row) => {
    return {
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
    };
  });

  // Pagination math as plain number (for IPage.IPagination compliance)
  const pages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages,
    },
    data,
  };
}
