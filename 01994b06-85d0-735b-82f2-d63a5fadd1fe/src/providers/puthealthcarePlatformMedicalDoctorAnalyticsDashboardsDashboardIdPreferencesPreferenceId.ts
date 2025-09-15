import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDashboardPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDashboardPreference";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Updates dashboard preferences (IHealthcarePlatformDashboardPreference) for a
 * given dashboard/preference record.
 *
 * This endpoint allows an authenticated medical doctor to update their saved
 * analytics dashboard settings—such as theme, layout, widget states, and last
 * view timestamp—for the specified dashboard and preferenceId. Only the
 * preference owner may perform the update. All changes are limited to allowed
 * fields by the DTO and audit fields are automatically kept in compliance.
 *
 * @param props - The operation props
 * @param props.medicalDoctor - The authenticated medical doctor making the
 *   request
 * @param props.dashboardId - UUID of the analytics dashboard for which
 *   preferences are being updated
 * @param props.preferenceId - UUID of the user's dashboard preference record to
 *   update
 * @param props.body - The update fields to apply; only preferences_json and/or
 *   last_viewed_at may be changed
 * @returns The updated dashboard preference record reflecting the new
 *   customization state
 * @throws {Error} If the preference is not found, is deleted, or if not owned
 *   by the authenticated user
 */
export async function puthealthcarePlatformMedicalDoctorAnalyticsDashboardsDashboardIdPreferencesPreferenceId(props: {
  medicalDoctor: MedicaldoctorPayload;
  dashboardId: string & tags.Format<"uuid">;
  preferenceId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformDashboardPreference.IUpdate;
}): Promise<IHealthcarePlatformDashboardPreference> {
  const { medicalDoctor, dashboardId, preferenceId, body } = props;

  // Fetch only an active, user-owned dashboard preference for update
  const pref =
    await MyGlobal.prisma.healthcare_platform_dashboard_preferences.findFirst({
      where: {
        id: preferenceId,
        dashboard_id: dashboardId,
        user_id: medicalDoctor.id,
        deleted_at: null,
      },
    });
  if (!pref)
    throw new Error("Dashboard preference not found or not owned by user");

  // Prepare update fields
  const updated_at: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const updateData = {
    ...(body.preferences_json !== undefined
      ? { preferences_json: body.preferences_json }
      : {}),
    ...(body.last_viewed_at !== undefined
      ? { last_viewed_at: body.last_viewed_at }
      : {}),
    updated_at: updated_at,
  };

  const updated =
    await MyGlobal.prisma.healthcare_platform_dashboard_preferences.update({
      where: { id: preferenceId },
      data: updateData,
    });

  // Format all date/date-time fields for the DTO
  return {
    id: updated.id,
    dashboard_id: updated.dashboard_id,
    user_id: updated.user_id,
    preferences_json: updated.preferences_json,
    last_viewed_at: updated.last_viewed_at
      ? toISOStringSafe(updated.last_viewed_at)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
