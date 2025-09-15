import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDashboardPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDashboardPreference";
import { NursePayload } from "../decorators/payload/NursePayload";

/**
 * Update analytics dashboard preferences for a specific dashboard and
 * preference.
 *
 * Updates the dashboard preferences record for the specified dashboardId and
 * preferenceId, allowing the authenticated nurse to change layout/theme/widget
 * settings or last-viewed state. Only the owner nurse can update their own
 * preferences. Returns the updated preferences record.
 *
 * @param props - Update parameters
 * @param props.nurse - Authenticated nurse payload
 * @param props.dashboardId - Target dashboard UUID
 * @param props.preferenceId - UUID of the preference record to update
 * @param props.body - Partial update object with new preferences_json and/or
 *   last_viewed_at
 * @returns Updated IHealthcarePlatformDashboardPreference object
 * @throws {Error} If preference does not exist, is deleted, or not owned by the
 *   nurse
 */
export async function puthealthcarePlatformNurseAnalyticsDashboardsDashboardIdPreferencesPreferenceId(props: {
  nurse: NursePayload;
  dashboardId: string & tags.Format<"uuid">;
  preferenceId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformDashboardPreference.IUpdate;
}): Promise<IHealthcarePlatformDashboardPreference> {
  const { nurse, dashboardId, preferenceId, body } = props;

  // 1. Find active preference for dashboard and nurse
  const preference =
    await MyGlobal.prisma.healthcare_platform_dashboard_preferences.findFirst({
      where: {
        id: preferenceId,
        dashboard_id: dashboardId,
        deleted_at: null,
      },
    });
  if (!preference) throw new Error("Dashboard preference not found");

  // 2. Owner check (only owner can update)
  if (preference.user_id !== nurse.id)
    throw new Error(
      "Unauthorized: only owner nurse can update dashboard preference",
    );

  // 3. Inline update data, using only present fields; updated_at is always set.
  const updated =
    await MyGlobal.prisma.healthcare_platform_dashboard_preferences.update({
      where: { id: preferenceId },
      data: {
        // Preferences JSON
        ...(body.preferences_json !== undefined && {
          preferences_json: body.preferences_json,
        }),
        // Last viewed at: set to null if explicitly provided as null, otherwise skip if undefined
        ...(body.last_viewed_at !== undefined && {
          last_viewed_at: body.last_viewed_at,
        }),
        // Always update this
        updated_at: toISOStringSafe(new Date()),
      },
    });

  return {
    id: updated.id,
    dashboard_id: updated.dashboard_id,
    user_id: updated.user_id,
    preferences_json: updated.preferences_json,
    last_viewed_at:
      updated.last_viewed_at !== undefined && updated.last_viewed_at !== null
        ? toISOStringSafe(updated.last_viewed_at)
        : updated.last_viewed_at,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== undefined && updated.deleted_at !== null
        ? toISOStringSafe(updated.deleted_at)
        : updated.deleted_at,
  };
}
