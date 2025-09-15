import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDashboardPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDashboardPreference";
import { PatientPayload } from "../decorators/payload/PatientPayload";

/**
 * Updates analytics dashboard preferences for a specific dashboard and
 * preference.
 *
 * This operation allows a patient user to update their own dashboard
 * customization settings—such as preferences, theme, or layout—for a given
 * dashboard. Only the owner of the preference (the authenticated patient) is
 * allowed to perform this action. The update is partial: only the fields
 * provided are changed (preferences_json and/or last_viewed_at), and an audit
 * timestamp is automatically updated. Validation enforces both existence and
 * authorization before updating.
 *
 * @param props - The props object containing the following fields:
 *
 *   - Patient: The authenticated patient user making the request
 *   - DashboardId: The UUID of the dashboard where preferences are stored
 *   - PreferenceId: The UUID of the specific preference record to update
 *   - Body: The update input, must include at least one updatable field
 *       (preferences_json or last_viewed_at)
 *
 * @returns The updated dashboard preference object, mapping all dates to string
 *   & tags.Format<'date-time'> and respecting optional/nullable DTO fields
 * @throws {Error} When the preference record is not found
 * @throws {Error} When the user is not the owner of the preference
 * @throws {Error} When no updatable fields are provided in the body
 */
export async function puthealthcarePlatformPatientAnalyticsDashboardsDashboardIdPreferencesPreferenceId(props: {
  patient: PatientPayload;
  dashboardId: string & tags.Format<"uuid">;
  preferenceId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformDashboardPreference.IUpdate;
}): Promise<IHealthcarePlatformDashboardPreference> {
  const { patient, dashboardId, preferenceId, body } = props;

  // 1. Validate preference exists, correct dashboard, and not soft-deleted
  const existing =
    await MyGlobal.prisma.healthcare_platform_dashboard_preferences.findFirst({
      where: {
        id: preferenceId,
        dashboard_id: dashboardId,
        deleted_at: null,
      },
    });
  if (!existing) throw new Error("Preference not found");

  // 2. Authorization: Only the owner (patient.id === user_id) can update
  if (existing.user_id !== patient.id) {
    throw new Error("Unauthorized: Only the owner can update this preference");
  }

  // 3. Ensure body contains at least one updatable field
  const bodyHasPreference = typeof body.preferences_json === "string";
  const bodyHasViewTime = Object.prototype.hasOwnProperty.call(
    body,
    "last_viewed_at",
  );
  if (!bodyHasPreference && !bodyHasViewTime) {
    throw new Error("No updatable fields provided");
  }

  // 4. Prepare update input, never use Date type, no mutations
  const updateInput = {
    ...(bodyHasPreference && { preferences_json: body.preferences_json }),
    ...(bodyHasViewTime && { last_viewed_at: body.last_viewed_at }),
    updated_at: toISOStringSafe(new Date()),
  };

  // 5. Apply update (only on allowed fields), do not touch unmentioned fields
  const updated =
    await MyGlobal.prisma.healthcare_platform_dashboard_preferences.update({
      where: { id: preferenceId },
      data: updateInput,
    });

  // 6. Return DTO, convert all dates and preserve nullable/optional
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
