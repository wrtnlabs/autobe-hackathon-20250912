import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDashboardPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDashboardPreference";
import { TechnicianPayload } from "../decorators/payload/TechnicianPayload";

/**
 * Create a new analytics dashboard preferences record
 * (IHealthcarePlatformDashboardPreference) for a specific dashboard.
 *
 * This operation creates a user-specific analytics dashboard preferences record
 * in the healthcare_platform_dashboard_preferences table. The technician must
 * be authorized to access the specified dashboard via ownership,
 * organization/department affiliation, or public visibility. The function will
 * throw errors if the dashboard does not exist, if the user does not have
 * permission, or if a preferences record already exists for the user/dashboard
 * combination.
 *
 * @param props - Request properties
 * @param props.technician - The authenticated technician user creating the
 *   preference
 * @param props.dashboardId - The UUID of the analytics dashboard the
 *   preferences are for
 * @param props.body - Request body with
 *   IHealthcarePlatformDashboardPreference.ICreate data
 * @returns The created IHealthcarePlatformDashboardPreference with all standard
 *   fields populated
 * @throws {Error} If the dashboard does not exist, access is forbidden, or the
 *   preference already exists
 */
export async function posthealthcarePlatformTechnicianAnalyticsDashboardsDashboardIdPreferences(props: {
  technician: TechnicianPayload;
  dashboardId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformDashboardPreference.ICreate;
}): Promise<IHealthcarePlatformDashboardPreference> {
  const { technician, dashboardId, body } = props;

  // Step 1: Validate dashboard existence and access
  const dashboard =
    await MyGlobal.prisma.healthcare_platform_analytics_dashboards.findFirst({
      where: {
        id: dashboardId,
        deleted_at: null,
      },
    });
  if (!dashboard) throw new Error("Dashboard not found");

  // Step 2: Technician org assignment lookup
  const orgAssignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: technician.id,
        deleted_at: null,
      },
    });
  if (!orgAssignment) throw new Error("Not assigned to any organization");

  // Step 3: Determine access: technician is owner, or within org, or dashboard is public
  const isOwner = dashboard.owner_user_id === orgAssignment.id;
  const inOrg =
    dashboard.organization_id ===
    orgAssignment.healthcare_platform_organization_id;
  const hasAccess = isOwner || inOrg || dashboard.is_public;
  if (!hasAccess)
    throw new Error(
      "Forbidden: you do not have permission to set preferences for this dashboard",
    );

  // Step 4: Uniqueness - prevent duplicate preference for (dashboard, user)
  const duplicate =
    await MyGlobal.prisma.healthcare_platform_dashboard_preferences.findFirst({
      where: {
        dashboard_id: dashboardId,
        user_id: technician.id,
      },
    });
  if (duplicate)
    throw new Error(
      "Dashboard preference already exists for this user/dashboard",
    );

  // Step 5: Create the new preference record
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.healthcare_platform_dashboard_preferences.create({
      data: {
        id: v4(),
        dashboard_id: dashboardId,
        user_id: technician.id,
        preferences_json: body.preferences_json,
        last_viewed_at: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  // Step 6: Compose DTO with strictly correct null and undefined behavior
  return {
    id: created.id,
    dashboard_id: created.dashboard_id,
    user_id: created.user_id,
    preferences_json: created.preferences_json,
    last_viewed_at: created.last_viewed_at
      ? toISOStringSafe(created.last_viewed_at)
      : null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
