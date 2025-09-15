import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDashboardPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDashboardPreference";
import { ReceptionistPayload } from "../decorators/payload/ReceptionistPayload";

/**
 * Update analytics dashboard preferences
 * (IHealthcarePlatformDashboardPreference) for a specific dashboard and
 * preference.
 *
 * Updates an existing dashboard preference record for a targeted analytics
 * dashboard and preferenceId. Only the owner (receptionist) of the preference
 * may update customization fields such as theme, layout, or widget
 * configuration. The operation ensures RBAC and organizational boundaries. It
 * applies only requested changes (partial update), always records updated_at,
 * and returns the fully hydrated preference state. Audit compliance is
 * maintained (soft deletion observed). Throws errors on not found, deleted, or
 * unauthorized access.
 *
 * @param props - Operation parameters.
 * @param props.receptionist - JWT authenticated receptionist payload (must own
 *   the dashboard preference).
 * @param props.dashboardId - UUID of the analytics dashboard whose preference
 *   is being updated.
 * @param props.preferenceId - UUID of the dashboard preference record to
 *   update.
 * @param props.body - Partial update with preferences_json and/or
 *   last_viewed_at.
 * @returns The updated IHealthcarePlatformDashboardPreference reflecting
 *   applied changes.
 * @throws {Error} If the preference does not exist, is deleted, or receptionist
 *   is not authorized.
 */
export async function puthealthcarePlatformReceptionistAnalyticsDashboardsDashboardIdPreferencesPreferenceId(props: {
  receptionist: ReceptionistPayload;
  dashboardId: string & tags.Format<"uuid">;
  preferenceId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformDashboardPreference.IUpdate;
}): Promise<IHealthcarePlatformDashboardPreference> {
  const { receptionist, dashboardId, preferenceId, body } = props;
  // Fetch existing preferences record, check existence and soft deletion
  const pref =
    await MyGlobal.prisma.healthcare_platform_dashboard_preferences.findFirst({
      where: {
        id: preferenceId,
        dashboard_id: dashboardId,
        deleted_at: null,
      },
    });
  if (!pref)
    throw new Error("Dashboard preference not found or has been deleted");
  // Authorization: only owner may update
  if (pref.user_id !== receptionist.id) {
    throw new Error(
      "You are not authorized to update this dashboard preference",
    );
  }
  // Only allow fields that are permitted for modification (preferences_json, last_viewed_at); always set updated_at
  const now = toISOStringSafe(new Date());
  const updatedPref =
    await MyGlobal.prisma.healthcare_platform_dashboard_preferences.update({
      where: { id: preferenceId },
      data: {
        preferences_json: body.preferences_json ?? undefined,
        last_viewed_at: body.last_viewed_at ?? undefined,
        updated_at: now,
      },
    });
  // Assemble return, ensuring all dates are formatted as ISO (string & tags.Format<'date-time'>), null/undefined respected
  return {
    id: updatedPref.id,
    dashboard_id: updatedPref.dashboard_id,
    user_id: updatedPref.user_id,
    preferences_json: updatedPref.preferences_json,
    last_viewed_at:
      updatedPref.last_viewed_at !== undefined &&
      updatedPref.last_viewed_at !== null
        ? toISOStringSafe(updatedPref.last_viewed_at)
        : undefined,
    created_at: toISOStringSafe(updatedPref.created_at),
    updated_at: toISOStringSafe(updatedPref.updated_at),
    deleted_at:
      updatedPref.deleted_at !== undefined && updatedPref.deleted_at !== null
        ? toISOStringSafe(updatedPref.deleted_at)
        : undefined,
  };
}
