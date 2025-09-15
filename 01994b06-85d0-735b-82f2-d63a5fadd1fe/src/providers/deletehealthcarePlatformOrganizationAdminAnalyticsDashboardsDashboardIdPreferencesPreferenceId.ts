import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Erase (soft-delete) dashboard preferences
 * (IHealthcarePlatformDashboardPreference) for a given dashboard and
 * preference.
 *
 * This operation disables all customizations for the specified dashboard by
 * marking the corresponding dashboard preferences record as deleted
 * (soft-delete) using the deleted_at column. If the preference is already
 * deleted, this operation is idempotent and returns success without error. Only
 * the organization admin for the dashboard's organization may erase the
 * preference. If the preference is not found or is outside the organization, an
 * error is thrown. No content is returned on success.
 *
 * @param props - Parameters for the operation
 * @param props.organizationAdmin - The authenticated organization admin
 *   performing the operation (must match dashboard organization)
 * @param props.dashboardId - The analytics dashboard UUID
 * @param props.preferenceId - The dashboard preference UUID to erase
 * @returns Void (no content)
 * @throws {Error} When the dashboard preference does not exist, does not match
 *   the dashboard, or the admin is not authorized (wrong org)
 */
export async function deletehealthcarePlatformOrganizationAdminAnalyticsDashboardsDashboardIdPreferencesPreferenceId(props: {
  organizationAdmin: OrganizationadminPayload;
  dashboardId: string & tags.Format<"uuid">;
  preferenceId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, dashboardId, preferenceId } = props;

  // 1. Find the preference record for the given dashboard and preference id
  const pref =
    await MyGlobal.prisma.healthcare_platform_dashboard_preferences.findFirst({
      where: {
        id: preferenceId,
        dashboard_id: dashboardId,
      },
    });
  if (!pref) throw new Error("Preference not found");

  // 2. Find the dashboard (must exist)
  const dashboard =
    await MyGlobal.prisma.healthcare_platform_analytics_dashboards.findUnique({
      where: { id: dashboardId },
    });
  if (!dashboard) throw new Error("Dashboard not found");

  // 3. Only org admin for the owning org may delete (dashboard.organization_id === admin.id)
  if (dashboard.organization_id !== organizationAdmin.id) {
    throw new Error("Forbidden: Not authorized for this organization");
  }

  // 4. If already deleted, operation is idempotent (success)
  if (pref.deleted_at !== null) return;

  // 5. Soft-delete (set deleted_at to now)
  await MyGlobal.prisma.healthcare_platform_dashboard_preferences.update({
    where: { id: pref.id },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
