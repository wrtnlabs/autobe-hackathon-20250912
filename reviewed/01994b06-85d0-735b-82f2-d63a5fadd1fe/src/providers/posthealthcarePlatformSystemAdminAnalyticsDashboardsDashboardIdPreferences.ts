import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDashboardPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDashboardPreference";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new analytics dashboard preferences record
 * (IHealthcarePlatformDashboardPreference) for a specific dashboard.
 *
 * This function creates a dashboard preferences record for a given analytics
 * dashboard, associated with the requesting user. It validates that the
 * dashboard exists, that no duplicate preference is present for the given user
 * and dashboard, and saves the provided preferences JSON. All date and UUID
 * fields are handled in strict branded form, and business rules for uniqueness
 * and authorization are honored.
 *
 * Authorization: Only a System Admin may perform this operation. The system
 * admin can create preferences for themselves or others. Duplicate creates for
 * the same (dashboard, user) pair are not allowed and will result in an error.
 *
 * @param props - SystemAdmin: SystemadminPayload — Authenticated system admin
 *   making the request dashboardId: string & tags.Format<'uuid'> — The
 *   analytics dashboard id (UUID) from the URL body:
 *   IHealthcarePlatformDashboardPreference.ICreate — Dashboard preference
 *   creation DTO, including user_id and preferences_json
 * @returns The newly created IHealthcarePlatformDashboardPreference object with
 *   all server-side fields populated
 * @throws {Error} If the dashboard does not exist, or a preference already
 *   exists for this dashboard/user
 */
export async function posthealthcarePlatformSystemAdminAnalyticsDashboardsDashboardIdPreferences(props: {
  systemAdmin: SystemadminPayload;
  dashboardId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformDashboardPreference.ICreate;
}): Promise<IHealthcarePlatformDashboardPreference> {
  const { systemAdmin, dashboardId, body } = props;

  // Validate that dashboard exists and is not deleted
  const dashboard =
    await MyGlobal.prisma.healthcare_platform_analytics_dashboards.findFirst({
      where: { id: dashboardId, deleted_at: null },
    });
  if (!dashboard) {
    throw new Error("Analytics dashboard not found");
  }

  // Check if a preference already exists for (dashboardId, user_id)
  const existingPref =
    await MyGlobal.prisma.healthcare_platform_dashboard_preferences.findFirst({
      where: {
        dashboard_id: dashboardId,
        user_id: body.user_id,
        deleted_at: null,
      },
    });
  if (existingPref) {
    throw new Error(
      "Dashboard preferences for this dashboard and user already exist",
    );
  }

  // Generate new UUID and current timestamp for creation
  const id = v4().toString();
  const now = toISOStringSafe(new Date());

  const created =
    await MyGlobal.prisma.healthcare_platform_dashboard_preferences.create({
      data: {
        id,
        dashboard_id: dashboardId,
        user_id: body.user_id,
        preferences_json: body.preferences_json,
        last_viewed_at: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  // Return a DTO that matches IHealthcarePlatformDashboardPreference
  return {
    id: created.id,
    dashboard_id: created.dashboard_id,
    user_id: created.user_id,
    preferences_json: created.preferences_json,
    last_viewed_at: created.last_viewed_at ?? null,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at ?? undefined,
  };
}
