import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDashboardPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDashboardPreference";
import { IPageIHealthcarePlatformDashboardPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformDashboardPreference";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and paginate dashboard preferences for a specific analytics dashboard
 * (healthcare_platform_dashboard_preferences table).
 *
 * This operation fetches a paginated list of user preference records associated
 * with a specified analytics dashboard. Only accessible to admins who are
 * owners of that dashboard (or extended team, if business logic evolves).
 * Supports advanced filter/search/sort/pagination on the
 * healthcare_platform_dashboard_preferences table. Returns a page of matching
 * dashboard preference objects. All date values are strictly ISO 8601 strings
 * (no Date objects). Throws an error if the dashboard does not exist or if the
 * admin is not permitted to access it.
 *
 * @param props - OrganizationAdmin: Authenticated admin payload for RBAC/authz
 *   check (organization admin role, contains id field for owner_user_id
 *   matching) dashboardId: UUID identifying the target analytics dashboard for
 *   query (must exist) body: Request object containing filters, pagination,
 *   sorting, search
 * @returns Paginated result of dashboard preferences for the specified
 *   dashboard
 * @throws {Error} If the dashboard does not exist or admin does not have access
 */
export async function patchhealthcarePlatformOrganizationAdminAnalyticsDashboardsDashboardIdPreferences(props: {
  organizationAdmin: OrganizationadminPayload;
  dashboardId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformDashboardPreference.IRequest;
}): Promise<IPageIHealthcarePlatformDashboardPreference> {
  const { organizationAdmin, dashboardId, body } = props;

  // 1. Fetch dashboard and validate admin access
  const dashboard =
    await MyGlobal.prisma.healthcare_platform_analytics_dashboards.findFirst({
      where: { id: dashboardId, deleted_at: null },
      select: { id: true, organization_id: true, owner_user_id: true },
    });
  if (!dashboard) {
    throw new Error("Dashboard not found");
  }
  if (dashboard.owner_user_id !== organizationAdmin.id) {
    throw new Error(
      "Unauthorized: Access to this dashboard's preferences is denied",
    );
  }

  // Pagination config
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // WHERE clause construction, strict null and undefined handling
  const whereFilter: Record<string, unknown> = {
    dashboard_id: dashboardId,
    deleted_at: null,
    ...(body.user_id !== undefined &&
      body.user_id !== null && { user_id: body.user_id }),
    ...(body.last_viewed_at_from !== undefined &&
      body.last_viewed_at_from !== null && {
        last_viewed_at: { gte: body.last_viewed_at_from },
      }),
    ...(body.last_viewed_at_to !== undefined &&
      body.last_viewed_at_to !== null && {
        last_viewed_at: {
          ...(body.last_viewed_at_from !== undefined &&
            body.last_viewed_at_from !== null && {
              gte: body.last_viewed_at_from,
            }),
          lte: body.last_viewed_at_to,
        },
      }),
    ...(body.created_at_from !== undefined &&
      body.created_at_from !== null && {
        created_at: { gte: body.created_at_from },
      }),
    ...(body.created_at_to !== undefined &&
      body.created_at_to !== null && {
        created_at: {
          ...(body.created_at_from !== undefined &&
            body.created_at_from !== null && {
              gte: body.created_at_from,
            }),
          lte: body.created_at_to,
        },
      }),
    ...(body.updated_at_from !== undefined &&
      body.updated_at_from !== null && {
        updated_at: { gte: body.updated_at_from },
      }),
    ...(body.updated_at_to !== undefined &&
      body.updated_at_to !== null && {
        updated_at: {
          ...(body.updated_at_from !== undefined &&
            body.updated_at_from !== null && {
              gte: body.updated_at_from,
            }),
          lte: body.updated_at_to,
        },
      }),
    ...(body.search !== undefined &&
      body.search !== null && {
        preferences_json: { contains: body.search },
      }),
  };

  // Sorting logic (safe fields only)
  let orderBy = { updated_at: "desc" };
  if (body.sort) {
    const [sortField, sortOrder] = body.sort.trim().split(/\s+/);
    if (
      ["updated_at", "created_at", "last_viewed_at", "user_id"].includes(
        sortField,
      )
    ) {
      orderBy = { [sortField]: sortOrder === "asc" ? "asc" : "desc" };
    }
  }

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_dashboard_preferences.findMany({
      where: whereFilter,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.healthcare_platform_dashboard_preferences.count({
      where: whereFilter,
    }),
  ]);

  // Result mapping (all date fields string, null/undefined as required)
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      dashboard_id: row.dashboard_id,
      user_id: row.user_id,
      preferences_json: row.preferences_json,
      last_viewed_at:
        row.last_viewed_at !== null && row.last_viewed_at !== undefined
          ? toISOStringSafe(row.last_viewed_at)
          : undefined,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at:
        row.deleted_at !== null && row.deleted_at !== undefined
          ? toISOStringSafe(row.deleted_at)
          : undefined,
    })),
  };
}
