import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDashboardPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDashboardPreference";
import { NursePayload } from "../decorators/payload/NursePayload";

/**
 * Create a new analytics dashboard preferences record
 * (IHealthcarePlatformDashboardPreference) for a specific dashboard.
 *
 * This function creates a new user-specific analytics dashboard preference
 * record for the given dashboard. It ensures that:
 *
 * - The authenticated nurse is creating the preference for themselves only
 * - The corresponding dashboard exists and is not deleted
 * - Duplicate preferences for the same user and dashboard are not allowed The
 *   returned object matches the IHealthcarePlatformDashboardPreference DTO,
 *   with all times as ISO8601 strings and all fields matching declared types.
 *
 * @param props.nurse - Authenticated nurse context. Authorization is enforced;
 *   nurse.id must match body.user_id.
 * @param props.dashboardId - The dashboard UUID for which the preferences are
 *   being created. Must match body.dashboard_id.
 * @param props.body - The dashboard preference configuration (preferences_json,
 *   user_id, dashboard_id)
 * @returns The fully populated preference record matching
 *   IHealthcarePlatformDashboardPreference
 * @throws {Error} If nurse is not creating their own preference, dashboard does
 *   not exist, dashboardId mismatch, or duplicate preference exists.
 */
export async function posthealthcarePlatformNurseAnalyticsDashboardsDashboardIdPreferences(props: {
  nurse: NursePayload;
  dashboardId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformDashboardPreference.ICreate;
}): Promise<IHealthcarePlatformDashboardPreference> {
  const { nurse, dashboardId, body } = props;

  // Authorization: nurse can only create preference for self
  if (nurse.id !== body.user_id) {
    throw new Error(
      "Unauthorized: Nurses can only create preferences for themselves",
    );
  }
  if (dashboardId !== body.dashboard_id) {
    throw new Error("dashboardId parameter must match body.dashboard_id");
  }

  // Confirm dashboard exists and is not deleted
  const dashboard =
    await MyGlobal.prisma.healthcare_platform_analytics_dashboards.findFirst({
      where: {
        id: dashboardId,
        deleted_at: null,
      },
    });
  if (!dashboard) {
    throw new Error("Dashboard not found or has been deleted");
  }

  // Confirm no duplicate preference exists
  const existing =
    await MyGlobal.prisma.healthcare_platform_dashboard_preferences.findFirst({
      where: {
        dashboard_id: dashboardId,
        user_id: nurse.id,
        deleted_at: null,
      },
    });
  if (existing) {
    throw new Error("A preference already exists for this user and dashboard");
  }

  // Timestamp now (string in date-time format)
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Create the new dashboard preference record
  const pref =
    await MyGlobal.prisma.healthcare_platform_dashboard_preferences.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        dashboard_id: dashboardId,
        user_id: nurse.id,
        preferences_json: body.preferences_json,
        created_at: now,
        updated_at: now,
      },
    });

  // Shape the return object strictly according to IHealthcarePlatformDashboardPreference
  return {
    id: pref.id,
    dashboard_id: pref.dashboard_id,
    user_id: pref.user_id,
    preferences_json: pref.preferences_json,
    last_viewed_at:
      pref.last_viewed_at != null
        ? toISOStringSafe(pref.last_viewed_at)
        : undefined,
    created_at: toISOStringSafe(pref.created_at),
    updated_at: toISOStringSafe(pref.updated_at),
    deleted_at:
      pref.deleted_at != null ? toISOStringSafe(pref.deleted_at) : undefined,
  };
}
