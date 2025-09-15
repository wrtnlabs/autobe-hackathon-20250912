import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDashboardPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDashboardPreference";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve a specific dashboard preference object by dashboardId and
 * preferenceId (healthcare_platform_dashboard_preferences table).
 *
 * Provides detailed information about a single user’s dashboard preference
 * settings, identified by preferenceId and associated with a specific
 * dashboardId. It queries healthcare_platform_dashboard_preferences, ensuring
 * the record exists, that the requester is authorized (dashboard owner,
 * assigned user, or admin), and returns the full preference object.
 *
 * Error conditions include missing or mismatched dashboard and preference IDs,
 * unauthorized access, or if the preference has been deleted. Data returned
 * supports user experience personalization, auditing, and preference management
 * requirements.
 *
 * @param props - Object containing all necessary parameters for the operation
 * @param props.organizationAdmin - The authenticated organization admin making
 *   the request
 * @param props.dashboardId - Unique identifier of the dashboard to which the
 *   preference belongs
 * @param props.preferenceId - Unique identifier of the dashboard preference
 *   being retrieved
 * @returns The detailed dashboard preference object for the specified dashboard
 *   and preference IDs
 * @throws {Error} If the preference or dashboard is not found, or the user is
 *   not authorized to access the preference
 */
export async function gethealthcarePlatformOrganizationAdminAnalyticsDashboardsDashboardIdPreferencesPreferenceId(props: {
  organizationAdmin: OrganizationadminPayload;
  dashboardId: string & tags.Format<"uuid">;
  preferenceId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformDashboardPreference> {
  const { organizationAdmin, dashboardId, preferenceId } = props;

  // Fetch the dashboard preference (not soft-deleted)
  const preference =
    await MyGlobal.prisma.healthcare_platform_dashboard_preferences.findFirst({
      where: {
        id: preferenceId,
        dashboard_id: dashboardId,
        deleted_at: null,
      },
    });
  if (!preference) {
    throw new Error("Preference record not found");
  }

  // Fetch dashboard for organization context
  const dashboard =
    await MyGlobal.prisma.healthcare_platform_analytics_dashboards.findFirst({
      where: {
        id: dashboardId,
      },
    });
  if (!dashboard) {
    throw new Error("Dashboard not found");
  }

  // Authorization: Admin must either own the preference or belong to the dashboard's organization
  const isOwner = preference.user_id === organizationAdmin.id;
  const isOrgAdmin = dashboard.organization_id === organizationAdmin.id;
  if (!isOwner && !isOrgAdmin) {
    throw new Error(
      "Unauthorized: Admin may only view preferences for their org or own dashboards",
    );
  }

  return {
    id: preference.id,
    dashboard_id: preference.dashboard_id,
    user_id: preference.user_id,
    preferences_json: preference.preferences_json,
    last_viewed_at:
      preference.last_viewed_at != null
        ? toISOStringSafe(preference.last_viewed_at)
        : undefined,
    created_at: toISOStringSafe(preference.created_at),
    updated_at: toISOStringSafe(preference.updated_at),
    deleted_at:
      preference.deleted_at != null
        ? toISOStringSafe(preference.deleted_at)
        : undefined,
  };
}
