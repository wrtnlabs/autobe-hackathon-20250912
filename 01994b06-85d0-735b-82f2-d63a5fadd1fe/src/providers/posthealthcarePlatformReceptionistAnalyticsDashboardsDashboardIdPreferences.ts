import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDashboardPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDashboardPreference";
import { ReceptionistPayload } from "../decorators/payload/ReceptionistPayload";

/**
 * Create a new analytics dashboard preferences record
 * (IHealthcarePlatformDashboardPreference) for a specific dashboard.
 *
 * Creates a new preference record for dashboard customization, storing
 * user-specific settings such as theme, layout, filters, widget configuration,
 * and last-view state for the given dashboardId parameter. The preference is
 * tied to the requesting receptionist (authenticated user) and the dashboard
 * specified in the URL. Ensures that duplicates cannot be created and that both
 * the dashboard and user exist and are active. Returns the full dashboard
 * preferences object.
 *
 * Authorization: Only authenticated receptionists may create preferences for
 * dashboards they can access.
 *
 * @param props.receptionist - The authenticated receptionist creating
 *   preferences.
 * @param props.dashboardId - The UUID of the analytics dashboard to create a
 *   preference for.
 * @param props.body - The user's dashboard preference configuration data
 *   (preferences_json, etc.)
 * @returns The created dashboard preferences record, including user and
 *   dashboard linkage and all relevant fields.
 * @throws {Error} If the dashboard does not exist or is deleted.
 * @throws {Error} If a preference already exists for this user/dashboard pair.
 */
export async function posthealthcarePlatformReceptionistAnalyticsDashboardsDashboardIdPreferences(props: {
  receptionist: ReceptionistPayload;
  dashboardId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformDashboardPreference.ICreate;
}): Promise<IHealthcarePlatformDashboardPreference> {
  const { receptionist, dashboardId, body } = props;

  // Verify dashboard exists and is not deleted
  const dashboard =
    await MyGlobal.prisma.healthcare_platform_analytics_dashboards.findFirst({
      where: {
        id: dashboardId,
        deleted_at: null,
      },
    });
  if (!dashboard) {
    throw new Error("Dashboard not found or inaccessible");
  }

  // Enforce uniqueness: only one preference per dashboard/user
  const exists =
    await MyGlobal.prisma.healthcare_platform_dashboard_preferences.findFirst({
      where: {
        dashboard_id: dashboardId,
        user_id: receptionist.id,
        deleted_at: null,
      },
    });
  if (exists) {
    throw new Error(
      "A preferences record already exists for this dashboard and user",
    );
  }

  // Timestamp for creation/update
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Create dashboard preference
  const created =
    await MyGlobal.prisma.healthcare_platform_dashboard_preferences.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        dashboard_id: dashboardId,
        user_id: receptionist.id,
        preferences_json: body.preferences_json,
        last_viewed_at: null,
        created_at: now,
        updated_at: now,
        // deleted_at left null (default)
      },
    });

  return {
    id: created.id,
    dashboard_id: created.dashboard_id,
    user_id: created.user_id,
    preferences_json: created.preferences_json,
    last_viewed_at: created.last_viewed_at,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at,
  };
}
