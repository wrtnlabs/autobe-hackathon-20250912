import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDashboardPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDashboardPreference";
import { TechnicianPayload } from "../decorators/payload/TechnicianPayload";

/**
 * Update analytics dashboard preferences for a specific dashboard and
 * preference.
 *
 * This operation updates the technician user's customized dashboard preferences
 * (such as layout, theme, widget, or filter settings) for a specific analytics
 * dashboard. Only the owner (technician) of the preference record may perform
 * this update. All changes are audited; violation of ownership results in a
 * forbidden error, and a missing record yields a not found error. Only the
 * fields preferences_json and last_viewed_at are mutable through this endpoint.
 * Timestamps are returned in ISO8601 string format (branded as date-time per
 * API schema).
 *
 * @param props - Operation parameters
 * @param props.technician - Authenticated technician user, must match
 *   preference owner
 * @param props.dashboardId - The dashboard UUID whose preferences are being
 *   updated
 * @param props.preferenceId - The preference record UUID
 * @param props.body - The set of updates (preferences_json, last_viewed_at)
 * @returns IHealthcarePlatformDashboardPreference reflecting the updated
 *   preference record
 * @throws {Error} 404 if record is not found; 403 if not owner/forbidden
 */
export async function puthealthcarePlatformTechnicianAnalyticsDashboardsDashboardIdPreferencesPreferenceId(props: {
  technician: TechnicianPayload;
  dashboardId: string & tags.Format<"uuid">;
  preferenceId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformDashboardPreference.IUpdate;
}): Promise<IHealthcarePlatformDashboardPreference> {
  const { technician, dashboardId, preferenceId, body } = props;

  // Step 1: Fetch the dashboard preference record (not deleted)
  const pref =
    await MyGlobal.prisma.healthcare_platform_dashboard_preferences.findFirst({
      where: {
        id: preferenceId,
        dashboard_id: dashboardId,
        deleted_at: null,
      },
    });
  if (!pref) throw new Error("Dashboard preference not found");

  // Step 2: Ownership enforcement - only owner can update
  if (pref.user_id !== technician.id)
    throw new Error(
      "Forbidden: Only the owner may update this dashboard preference",
    );

  // Step 3: Apply only the allowed updates
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.healthcare_platform_dashboard_preferences.update({
      where: { id: preferenceId },
      data: {
        preferences_json:
          body.preferences_json !== undefined
            ? body.preferences_json
            : pref.preferences_json,
        last_viewed_at:
          body.last_viewed_at !== undefined
            ? body.last_viewed_at
            : pref.last_viewed_at,
        updated_at: now,
      },
    });

  // Step 4: Return properly typed, serialized result
  return {
    id: updated.id,
    dashboard_id: updated.dashboard_id,
    user_id: updated.user_id,
    preferences_json: updated.preferences_json,
    last_viewed_at: updated.last_viewed_at
      ? toISOStringSafe(updated.last_viewed_at)
      : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
