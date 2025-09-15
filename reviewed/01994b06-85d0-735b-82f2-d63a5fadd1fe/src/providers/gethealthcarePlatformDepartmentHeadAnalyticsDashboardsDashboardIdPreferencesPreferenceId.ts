import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDashboardPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDashboardPreference";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Retrieve a specific dashboard preference object by dashboardId and
 * preferenceId.
 *
 * This operation provides detailed information about a single user's dashboard
 * preference settings in the healthcare_platform_dashboard_preferences table,
 * identified by preferenceId and dashboardId. It verifies the requester
 * (department head) is authorized, either as the dashboard preference owner or
 * dashboard owner. All lookups are restricted to active (not deleted) records.
 *
 * If the preference does not exist, the dashboard is missing, or the requester
 * is unauthorized, an error is thrown. All retrievals are auditable for
 * compliance.
 *
 * @param props - Request parameters
 * @param props.departmentHead - The authenticated DepartmentheadPayload
 *   (requesting user)
 * @param props.dashboardId - Dashboard UUID to which the preference belongs
 * @param props.preferenceId - UUID of the dashboard preference to retrieve
 * @returns The full dashboard preference object with strict field mapping,
 *   dates as ISO8601 strings, and null/undefined conformance to API contract
 * @throws {Error} If preference or dashboard does not exist, or the requester
 *   is not authorized to view this preference
 */
export async function gethealthcarePlatformDepartmentHeadAnalyticsDashboardsDashboardIdPreferencesPreferenceId(props: {
  departmentHead: DepartmentheadPayload;
  dashboardId: string & tags.Format<"uuid">;
  preferenceId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformDashboardPreference> {
  const { departmentHead, dashboardId, preferenceId } = props;
  // Fetch preference record (active only)
  const preference =
    await MyGlobal.prisma.healthcare_platform_dashboard_preferences.findFirst({
      where: {
        id: preferenceId,
        dashboard_id: dashboardId,
        deleted_at: null,
      },
    });
  if (preference === null) {
    throw new Error("Dashboard preference not found");
  }

  // Fetch dashboard for ownership/authorization
  const dashboard =
    await MyGlobal.prisma.healthcare_platform_analytics_dashboards.findFirst({
      where: {
        id: dashboardId,
        deleted_at: null,
      },
      select: {
        owner_user_id: true,
      },
    });
  if (dashboard === null) {
    throw new Error("Analytics dashboard not found");
  }

  // Authorization: owner of preference, or owner of dashboard
  const isPreferenceOwner = preference.user_id === departmentHead.id;
  const isDashboardOwner = dashboard.owner_user_id === departmentHead.id;
  if (!isPreferenceOwner && !isDashboardOwner) {
    throw new Error(
      "Forbidden: You do not have access to this dashboard preference",
    );
  }

  // Convert and map all required fields, handling nullable and optional according to the DTO
  return {
    id: preference.id,
    dashboard_id: preference.dashboard_id,
    user_id: preference.user_id,
    preferences_json: preference.preferences_json,
    last_viewed_at:
      preference.last_viewed_at !== null &&
      preference.last_viewed_at !== undefined
        ? toISOStringSafe(preference.last_viewed_at)
        : undefined,
    created_at: toISOStringSafe(preference.created_at),
    updated_at: toISOStringSafe(preference.updated_at),
    deleted_at:
      preference.deleted_at !== null && preference.deleted_at !== undefined
        ? toISOStringSafe(preference.deleted_at)
        : undefined,
  };
}
