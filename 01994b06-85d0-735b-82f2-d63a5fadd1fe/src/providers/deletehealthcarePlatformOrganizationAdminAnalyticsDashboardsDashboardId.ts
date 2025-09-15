import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Soft-delete an analytics dashboard (soft delete via deleted_at;
 * healthcare_platform_analytics_dashboards table).
 *
 * This operation marks the specified analytics dashboard as deleted by setting
 * its deleted_at field. The dashboard becomes inaccessible in normal workflows
 * but is retained for audit, compliance, or possible restoration.
 *
 * Only an authorized user (dashboard owner or an organizationadmin for the
 * parent organization) can execute the deletion. Deletion requests are
 * validated for dashboard existence, current deletion state (not already
 * deleted), and authorization. The physical record is never removed, only
 * flagged.
 *
 * @param props - Object containing request parameters
 * @param props.organizationAdmin - The authenticated organization admin
 *   (OrganizationadminPayload)
 * @param props.dashboardId - The UUID of the analytics dashboard to be
 *   soft-deleted
 * @returns Void (throws if operation fails)
 * @throws {Error} If the dashboard does not exist, is already deleted, or the
 *   user is unauthorized
 */
export async function deletehealthcarePlatformOrganizationAdminAnalyticsDashboardsDashboardId(props: {
  organizationAdmin: OrganizationadminPayload;
  dashboardId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, dashboardId } = props;

  // Step 1: Retrieve the dashboard, ensure it exists and is not deleted
  const dashboard =
    await MyGlobal.prisma.healthcare_platform_analytics_dashboards.findFirst({
      where: {
        id: dashboardId,
      },
    });
  if (!dashboard) throw new Error("Dashboard not found");
  if (dashboard.deleted_at !== null)
    throw new Error("Dashboard already deleted");

  // Step 2: Authorization - must be dashboard owner or org admin of parent org
  // Fetch the organization assignment for this admin
  const orgAssignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: organizationAdmin.id,
        healthcare_platform_organization_id: dashboard.organization_id,
        deleted_at: null,
        assignment_status: "active",
      },
    });
  const isDashboardOwner = dashboard.owner_user_id === organizationAdmin.id;
  if (!isDashboardOwner && !orgAssignment) {
    throw new Error(
      "Unauthorized: You must be the owner or an active organization admin for this organization to delete this dashboard",
    );
  }

  // Step 3: Soft delete
  await MyGlobal.prisma.healthcare_platform_analytics_dashboards.update({
    where: { id: dashboardId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
