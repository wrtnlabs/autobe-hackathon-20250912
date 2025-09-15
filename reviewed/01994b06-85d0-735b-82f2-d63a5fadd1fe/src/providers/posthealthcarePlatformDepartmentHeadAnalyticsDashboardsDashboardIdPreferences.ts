import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDashboardPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDashboardPreference";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Creates a new analytics dashboard preference record for a department head
 * user.
 *
 * This operation allows a department head to store user-specific
 * personalization or customization settings for an analytics dashboard—such as
 * themes, layouts, filters, or widget configs—tied to the specified
 * dashboardId. Only one preference record is permitted per departmentHead and
 * dashboard. Authorization is enforced such that the department head must
 * either own the dashboard or belong to the same organization/department as the
 * dashboard. Attempts to store duplicate or unauthorized preferences will
 * result in an error.
 *
 * @param props - The request payload including:
 * @param props.departmentHead - The authenticated DepartmentheadPayload for the
 *   acting department head
 * @param props.dashboardId - The dashboard ID for which to create preferences
 * @param props.body - The preference creation DTO (must have user_id matching
 *   the departmentHead)
 * @returns The newly created IHealthcarePlatformDashboardPreference object,
 *   with all dates as ISO 8601 strings
 * @throws {Error} If the dashboard does not exist, user is not authorized,
 *   user_id is mismatched, or a duplicate preference exists
 */
export async function posthealthcarePlatformDepartmentHeadAnalyticsDashboardsDashboardIdPreferences(props: {
  departmentHead: DepartmentheadPayload;
  dashboardId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformDashboardPreference.ICreate;
}): Promise<IHealthcarePlatformDashboardPreference> {
  const { departmentHead, dashboardId, body } = props;

  // 1. Retrieve the target dashboard by ID
  const dashboard =
    await MyGlobal.prisma.healthcare_platform_analytics_dashboards.findFirst({
      where: {
        id: dashboardId,
        deleted_at: null,
      },
    });
  if (!dashboard) {
    throw new Error("Dashboard not found");
  }

  // 2. Retrieve the department head's user organization assignment
  const assignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: departmentHead.id,
        deleted_at: null,
      },
    });
  if (!assignment) {
    throw new Error("User/assignment not found");
  }

  // 3. Authorization: Department head must own or belong to the organization/department for this dashboard
  const ownsDashboard = dashboard.owner_user_id === assignment.id;
  const organizationMatch =
    dashboard.organization_id ===
    assignment.healthcare_platform_organization_id;
  const departmentMatch =
    typeof dashboard.department_id === "string" &&
    typeof assignment.healthcare_platform_department_id === "string"
      ? dashboard.department_id === assignment.healthcare_platform_department_id
      : true;
  if (!(ownsDashboard || (organizationMatch && departmentMatch))) {
    throw new Error("Not authorized to create preferences for this dashboard");
  }

  // 4. Ensure that the user_id in the body matches the authenticated requester
  if (body.user_id !== departmentHead.id) {
    throw new Error("user_id in request does not match authenticated user");
  }

  // 5. Prevent duplicate preferences for (dashboard, user)
  const duplicate =
    await MyGlobal.prisma.healthcare_platform_dashboard_preferences.findFirst({
      where: {
        dashboard_id: dashboardId,
        user_id: body.user_id,
        deleted_at: null,
      },
    });
  if (duplicate) {
    throw new Error(
      "A preferences record already exists for this user-dashboard pair",
    );
  }

  // 6. Create the preference record
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.healthcare_platform_dashboard_preferences.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        dashboard_id: dashboardId,
        user_id: departmentHead.id,
        preferences_json: body.preferences_json,
        last_viewed_at: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  // 7. Return the created DTO, ensuring type/brand compliance on all fields
  return {
    id: created.id,
    dashboard_id: created.dashboard_id,
    user_id: created.user_id,
    preferences_json: created.preferences_json,
    last_viewed_at: created.last_viewed_at ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ?? null,
  };
}
