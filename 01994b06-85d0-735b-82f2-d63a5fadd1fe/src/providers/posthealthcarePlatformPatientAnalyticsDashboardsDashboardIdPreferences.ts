import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDashboardPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDashboardPreference";
import { PatientPayload } from "../decorators/payload/PatientPayload";

/**
 * Create a new analytics dashboard preferences record for a patient's
 * dashboard.
 *
 * This endpoint allows a patient user to create a new personalized dashboard
 * preference record for a specified analytics dashboard. It stores the
 * patient's custom settings (theme, layout, filters, widget state, etc.) and
 * associates them to both the dashboard and the user. Duplicate preferences for
 * the same (dashboard,user) combination are not permitted. Authorization is
 * enforced to ensure the patient is a member of the dashboard's organization.
 *
 * @param props - The data required: authenticated patient, dashboardId param,
 *   and preference config in body.
 * @param props.patient - The authenticated patient user making the request
 * @param props.dashboardId - The dashboard for which to create preferences
 * @param props.body - The preference config:
 *   dashboard_id/user_id/preferences_json
 * @returns The created dashboard preference record with all fields populated
 * @throws {Error} When dashboard does not exist or is soft-deleted.
 * @throws {Error} When patient is not assigned to the dashboard's organization.
 * @throws {Error} On duplicate: when a preference already exists for the same
 *   dashboard/user.
 */
export async function posthealthcarePlatformPatientAnalyticsDashboardsDashboardIdPreferences(props: {
  patient: PatientPayload;
  dashboardId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformDashboardPreference.ICreate;
}): Promise<IHealthcarePlatformDashboardPreference> {
  const { patient, dashboardId, body } = props;
  // Step 1: Check dashboard exists and not deleted
  const dashboard =
    await MyGlobal.prisma.healthcare_platform_analytics_dashboards.findFirst({
      where: {
        id: dashboardId,
        deleted_at: null,
      },
    });
  if (!dashboard) throw new Error("Dashboard not found");

  // Step 2: Authorization: patient must be member of dashboard's organization
  const assignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: patient.id,
        deleted_at: null,
        healthcare_platform_organization_id: dashboard.organization_id,
      },
    });
  if (!assignment) {
    throw new Error(
      "Access denied: patient is not assigned to dashboard organization",
    );
  }

  // Step 3: Prevent duplicate preferences for dashboard/user (unique [dashboard_id, user_id] and not soft deleted)
  const duplicate =
    await MyGlobal.prisma.healthcare_platform_dashboard_preferences.findFirst({
      where: {
        dashboard_id: dashboardId,
        user_id: patient.id,
        deleted_at: null,
      },
    });
  if (duplicate)
    throw new Error("Preference already exists for this dashboard/user");

  // Ensure that dashboard_id/user_id in body match the URL/auth
  if (body.dashboard_id !== dashboardId) {
    throw new Error("dashboard_id in body does not match path parameter");
  }
  if (body.user_id !== patient.id) {
    throw new Error("user_id in body does not match authenticated patient");
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.healthcare_platform_dashboard_preferences.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        dashboard_id,
        user_id: patient.id,
        preferences_json: body.preferences_json,
        created_at: now,
        updated_at: now,
      },
    });

  return {
    id: created.id,
    dashboard_id: created.dashboard_id,
    user_id: created.user_id,
    preferences_json: created.preferences_json,
    last_viewed_at:
      created.last_viewed_at === null ? undefined : created.last_viewed_at,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at === null ? undefined : created.deleted_at,
  };
}
