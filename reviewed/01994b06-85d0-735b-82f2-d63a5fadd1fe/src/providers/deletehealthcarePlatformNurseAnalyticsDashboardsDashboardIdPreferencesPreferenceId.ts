import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { NursePayload } from "../decorators/payload/NursePayload";

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
 * designated admin can erase the preference record. Successful response returns
 * no content. Validation includes existence checks for both dashboard and
 * preferenceId, as well as proper permission enforcement. If preference is
 * already deleted, the operation is idempotent and returns success.
 *
 * @param props - Nurse: Authenticated nurse requesting the preference erase
 *   dashboardId: The dashboard UUID for which the preference relates
 *   preferenceId: The unique preference record UUID to soft-delete
 * @returns Void
 * @throws {Error} If the preference is not found or the nurse is not the owner
 */
export async function deletehealthcarePlatformNurseAnalyticsDashboardsDashboardIdPreferencesPreferenceId(props: {
  nurse: NursePayload;
  dashboardId: string & tags.Format<"uuid">;
  preferenceId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { nurse, dashboardId, preferenceId } = props;

  // Locate the dashboard preference using composite criteria
  const pref =
    await MyGlobal.prisma.healthcare_platform_dashboard_preferences.findFirst({
      where: {
        id: preferenceId,
        dashboard_id: dashboardId,
      },
    });

  // Not found = idempotent success (deletion is already true for non-existent records)
  if (!pref) return;
  // If already deleted, consider idempotent success
  if (pref.deleted_at !== null) return;
  // Only owner may delete
  if (pref.user_id !== nurse.id) {
    throw new Error(
      "Forbidden: Only the owner can delete this dashboard preference",
    );
  }

  // Soft-delete by setting deleted_at to now (ISO 8601 string)
  await MyGlobal.prisma.healthcare_platform_dashboard_preferences.update({
    where: { id: preferenceId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
  // Return void (success)
}
