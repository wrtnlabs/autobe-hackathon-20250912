import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsDashboard";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve a specific analytics dashboard by its identifier
 *
 * This operation fetches the full record of an analytics dashboard specified by
 * the dashboardId path parameter. It returns all configuration, layout, and
 * metadata needed to render the dashboard for analytics and reporting
 * experiences, including title, description, sharing and scoping information.
 *
 * Authorization: Requires systemAdmin authentication. Accessible to any system
 * admin.
 *
 * @param props - Input including authenticated systemAdmin and dashboardId
 * @param props.systemAdmin - The authenticated system administrator performing
 *   the request
 * @param props.dashboardId - The UUID identifier of the dashboard to retrieve
 * @returns The full analytics dashboard configuration, layout, and context
 * @throws {Error} If no dashboard with the given id is found or is soft-deleted
 */
export async function gethealthcarePlatformSystemAdminAnalyticsDashboardsDashboardId(props: {
  systemAdmin: SystemadminPayload;
  dashboardId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformAnalyticsDashboard> {
  const { dashboardId } = props;
  const dbDashboard =
    await MyGlobal.prisma.healthcare_platform_analytics_dashboards.findFirst({
      where: {
        id: dashboardId,
        deleted_at: null,
      },
    });
  if (!dbDashboard) {
    throw new Error("Dashboard not found");
  }
  return {
    id: dbDashboard.id,
    owner_user_id: dbDashboard.owner_user_id,
    organization_id: dbDashboard.organization_id,
    department_id: dbDashboard.department_id ?? undefined,
    title: dbDashboard.title,
    description: dbDashboard.description ?? undefined,
    config_json: dbDashboard.config_json,
    is_public: dbDashboard.is_public,
    created_at: toISOStringSafe(dbDashboard.created_at),
    updated_at: toISOStringSafe(dbDashboard.updated_at),
    deleted_at: dbDashboard.deleted_at
      ? toISOStringSafe(dbDashboard.deleted_at)
      : undefined,
  };
}
