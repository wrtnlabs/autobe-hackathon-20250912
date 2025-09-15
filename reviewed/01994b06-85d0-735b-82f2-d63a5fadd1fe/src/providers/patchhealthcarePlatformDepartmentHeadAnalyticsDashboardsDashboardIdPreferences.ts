import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDashboardPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDashboardPreference";
import { IPageIHealthcarePlatformDashboardPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformDashboardPreference";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Search and paginate dashboard preferences for a specific analytics dashboard
 * (healthcare_platform_dashboard_preferences table).
 *
 * This operation retrieves a filtered, paginated list of analytic dashboard
 * preference settings for a given dashboard. Security is enforced so that only
 * the dashboard owner (department head) can access this list. Supports
 * filtering, pagination, free-text search (on preferences_json), and flexible
 * sort.
 *
 * @param props - Input object
 * @param props.departmentHead - Authenticated DepartmentheadPayload
 * @param props.dashboardId - Dashboard UUID whose preferences are to be listed
 * @param props.body - Search, filter and pagination options
 * @returns Paginated list of dashboard preferences for the dashboardId.
 * @throws Error if dashboard not found or access is denied.
 */
export async function patchhealthcarePlatformDepartmentHeadAnalyticsDashboardsDashboardIdPreferences(props: {
  departmentHead: DepartmentheadPayload;
  dashboardId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformDashboardPreference.IRequest;
}): Promise<IPageIHealthcarePlatformDashboardPreference> {
  const { departmentHead, dashboardId, body } = props;

  // 1. Authorization check: Must be dashboard owner
  const dashboard =
    await MyGlobal.prisma.healthcare_platform_analytics_dashboards.findFirst({
      where: { id: dashboardId, deleted_at: null },
    });
  if (!dashboard || dashboard.owner_user_id !== departmentHead.id) {
    throw new Error("Access denied");
  }

  // 2. Build where filter from body
  const where: Record<string, unknown> = {
    dashboard_id: dashboardId,
    deleted_at: null,
    ...(body.user_id !== undefined && body.user_id !== null
      ? { user_id: body.user_id }
      : {}),
    ...(body.last_viewed_at_from !== undefined &&
    body.last_viewed_at_from !== null
      ? { last_viewed_at: { gte: body.last_viewed_at_from } }
      : {}),
    ...(body.last_viewed_at_to !== undefined && body.last_viewed_at_to !== null
      ? { last_viewed_at: { lte: body.last_viewed_at_to } }
      : {}),
    ...(body.created_at_from !== undefined && body.created_at_from !== null
      ? { created_at: { gte: body.created_at_from } }
      : {}),
    ...(body.created_at_to !== undefined && body.created_at_to !== null
      ? { created_at: { lte: body.created_at_to } }
      : {}),
    ...(body.updated_at_from !== undefined && body.updated_at_from !== null
      ? { updated_at: { gte: body.updated_at_from } }
      : {}),
    ...(body.updated_at_to !== undefined && body.updated_at_to !== null
      ? { updated_at: { lte: body.updated_at_to } }
      : {}),
  };

  // 3. Text search
  if (
    body.search !== undefined &&
    body.search !== null &&
    body.search.length > 0
  ) {
    where.preferences_json = { contains: body.search };
  }

  // 4. Sorting
  let orderBy: Record<string, "desc" | "asc"> = { updated_at: "desc" };
  if (typeof body.sort === "string" && body.sort.length > 0) {
    const [sortField, sortDir] = body.sort.trim().split(/\s+/);
    const field = [
      "id",
      "dashboard_id",
      "user_id",
      "last_viewed_at",
      "created_at",
      "updated_at",
      "deleted_at",
    ].includes(sortField)
      ? sortField
      : "updated_at";
    const dir = sortDir === "asc" ? "asc" : "desc";
    orderBy = { [field]: dir };
  }

  // 5. Pagination
  const page = typeof body.page === "number" && body.page > 0 ? body.page : 1;
  const limit =
    typeof body.limit === "number" && body.limit > 0 ? body.limit : 20;
  const skip = (page - 1) * limit;

  // 6. Query DB and count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_dashboard_preferences.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.healthcare_platform_dashboard_preferences.count({ where }),
  ]);

  // 7. Build and return DTO list with strict date string conversion for nullable fields
  const dtoRows = rows.map((row) => ({
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
  }));

  // 8. Return paginated result
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(total / limit),
    },
    data: dtoRows,
  };
}
