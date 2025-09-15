import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDashboardPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDashboardPreference";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Create a new analytics dashboard preferences record
 * (IHealthcarePlatformDashboardPreference) for a specific dashboard.
 *
 * This endpoint creates a new dashboard preferences record for the specified
 * analytics dashboard. It saves user-specific customization settings (such as
 * theme, layout, filters, widget configuration, and last-view state) tied to
 * the provided dashboardId. The operation checks the existence of the dashboard
 * and avoids creating duplicate preferences. It requires authentication as
 * medicalDoctor and ensures the dashboard exists.
 *
 * @param props - The props object for this operation
 * @param props.medicalDoctor - The authenticated MedicaldoctorPayload,
 *   representing the user saving dashboard preferences
 * @param props.dashboardId - The UUID of the target analytics dashboard
 * @param props.body - The IHealthcarePlatformDashboardPreference.ICreate DTO
 *   with preferences_json, user_id, dashboard_id
 * @returns The created IHealthcarePlatformDashboardPreference object, including
 *   all configuration fields
 * @throws {Error} If the dashboard does not exist, or if a preference record
 *   for this user/dashboard already exists
 */
export async function posthealthcarePlatformMedicalDoctorAnalyticsDashboardsDashboardIdPreferences(props: {
  medicalDoctor: MedicaldoctorPayload;
  dashboardId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformDashboardPreference.ICreate;
}): Promise<IHealthcarePlatformDashboardPreference> {
  const { medicalDoctor, dashboardId, body } = props;

  // Verify dashboard existence
  const dashboard =
    await MyGlobal.prisma.healthcare_platform_analytics_dashboards.findUnique({
      where: { id: dashboardId },
      select: { id: true },
    });
  if (!dashboard) {
    throw new Error("Dashboard not found");
  }

  // Check for existing preferences for the given user and dashboard
  const existing =
    await MyGlobal.prisma.healthcare_platform_dashboard_preferences.findFirst({
      where: {
        dashboard_id: dashboardId,
        user_id: body.user_id,
      },
      select: { id: true },
    });
  if (existing) {
    throw new Error(
      "A preferences record already exists for this user and dashboard",
    );
  }

  // Create the new dashboard preference
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.healthcare_platform_dashboard_preferences.create({
      data: {
        id: v4(),
        dashboard_id: dashboardId,
        user_id: body.user_id,
        preferences_json: body.preferences_json,
        created_at: now,
        updated_at: now,
      },
    });

  // Return the DTO, formatting all fields and omitting nulls for optionals
  return {
    id: created.id,
    dashboard_id: created.dashboard_id,
    user_id: created.user_id,
    preferences_json: created.preferences_json,
    last_viewed_at:
      created.last_viewed_at !== null
        ? toISOStringSafe(created.last_viewed_at)
        : undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
