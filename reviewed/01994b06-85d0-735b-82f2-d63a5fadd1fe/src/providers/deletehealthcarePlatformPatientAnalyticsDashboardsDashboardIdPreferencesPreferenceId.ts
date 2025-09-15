import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { PatientPayload } from "../decorators/payload/PatientPayload";

/**
 * Erase (soft-delete) dashboard preferences
 * (IHealthcarePlatformDashboardPreference) for a given dashboard and
 * preference.
 *
 * Permanently disables a user or organization's dashboard preference settings
 * by marking the specified preference record as deleted via the deleted_at
 * column in the healthcare_platform_dashboard_preferences table (soft delete).
 * This disables all customizations for the specified dashboard until a new
 * preference is created. Authorization is required to ensure only the owner or
 * designated user can erase the preference record. Successful response returns
 * no content. Validation includes existence checks for both dashboard and
 * preferenceId, as well as proper permission enforcement. If preference is
 * already deleted, the operation is idempotent and returns success.
 *
 * @param props - Object containing all necessary parameters for the operation
 * @param props.patient - The authenticated patient performing the request
 * @param props.dashboardId - The unique identifier of the analytics dashboard
 *   for which the preference is erased
 * @param props.preferenceId - The unique identifier for the user dashboard
 *   preference record to erase
 * @returns Void
 * @throws {Error} When the preference record does not exist or is not owned by
 *   the patient
 */
export async function deletehealthcarePlatformPatientAnalyticsDashboardsDashboardIdPreferencesPreferenceId(props: {
  patient: PatientPayload;
  dashboardId: string & tags.Format<"uuid">;
  preferenceId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { patient, dashboardId, preferenceId } = props;

  // Fetch the dashboard preference, ensuring ownership and not soft-deleted
  const preference =
    await MyGlobal.prisma.healthcare_platform_dashboard_preferences.findFirst({
      where: {
        id: preferenceId,
        dashboard_id: dashboardId,
        user_id: patient.id,
        deleted_at: null,
      },
    });

  if (!preference) {
    // Not found or not owned by requesting patient (or already soft-deleted)
    throw new Error(
      "Dashboard preference not found or you do not have permission.",
    );
  }

  // Soft-delete the preference by setting deleted_at (audit-compliant, idempotent)
  await MyGlobal.prisma.healthcare_platform_dashboard_preferences.update({
    where: { id: preferenceId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
  // No return value is necessary for void
}
