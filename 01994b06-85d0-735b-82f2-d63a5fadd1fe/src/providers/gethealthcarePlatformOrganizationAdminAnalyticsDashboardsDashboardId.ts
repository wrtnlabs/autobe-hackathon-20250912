import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsDashboard";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve a specific analytics dashboard by its identifier
 *
 * Fetches the full record of an analytics dashboard specified by the
 * dashboardId path parameter. The healthcare_platform_analytics_dashboards
 * schema holds all metadata and configuration necessary to render dashboards
 * for end users, including dashboard title, description, configuration JSON,
 * owner, visibility, and linkage to organization or department contexts.
 *
 * Authorization: Only organization admins can access dashboards within their
 * own organization.
 *
 * @param props - OrganizationAdmin: The authenticated organization admin
 *   requesting the dashboard dashboardId: The unique identifier of the
 *   dashboard to retrieve
 * @returns Full analytics dashboard configuration and metadata
 * @throws {Error} If dashboard does not exist, is deleted, or is not within the
 *   admin's organization
 */
export async function gethealthcarePlatformOrganizationAdminAnalyticsDashboardsDashboardId(props: {
  organizationAdmin: OrganizationadminPayload;
  dashboardId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformAnalyticsDashboard> {
  const { organizationAdmin, dashboardId } = props;
  const dashboard =
    await MyGlobal.prisma.healthcare_platform_analytics_dashboards.findFirst({
      where: {
        id: dashboardId,
        deleted_at: null,
      },
    });

  if (!dashboard || dashboard.organization_id !== organizationAdmin.id) {
    throw new Error("Dashboard not found or not authorized");
  }

  return {
    id: dashboard.id,
    owner_user_id: dashboard.owner_user_id,
    organization_id: dashboard.organization_id,
    ...(dashboard.department_id !== undefined
      ? { department_id: dashboard.department_id }
      : {}),
    title: dashboard.title,
    ...(dashboard.description !== undefined
      ? { description: dashboard.description }
      : {}),
    config_json: dashboard.config_json,
    is_public: dashboard.is_public,
    created_at: toISOStringSafe(dashboard.created_at),
    updated_at: toISOStringSafe(dashboard.updated_at),
    ...(dashboard.deleted_at !== undefined
      ? {
          deleted_at: dashboard.deleted_at
            ? toISOStringSafe(dashboard.deleted_at)
            : null,
        }
      : {}),
  };
}
