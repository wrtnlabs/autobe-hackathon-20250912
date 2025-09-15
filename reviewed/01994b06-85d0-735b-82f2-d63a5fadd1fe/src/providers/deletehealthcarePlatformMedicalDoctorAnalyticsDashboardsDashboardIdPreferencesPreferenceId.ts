import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Erase (soft-delete) dashboard preferences for a given dashboard and
 * preference.
 *
 * This operation disables a user or organization's dashboard preference
 * settings by marking the specified preference record as deleted via the
 * deleted_at column in the healthcare_platform_dashboard_preferences table
 * (soft delete). This disables all customizations for the specified analytics
 * dashboard until a new preference is created. Authorization is strictly
 * enforced: only the owner medical doctor may erase the preference. Existence
 * and permission are validated before proceeding. The operation is idempotent
 * if already deleted; otherwise, deleted_at is set.
 *
 * @param props - The deletion context
 * @param props.medicalDoctor - Authenticated medical doctor payload (must match
 *   preference owner)
 * @param props.dashboardId - The dashboard for which the preference is erased
 *   (UUID)
 * @param props.preferenceId - The dashboard preference record to erase (UUID)
 * @returns Void
 * @throws {Error} If the dashboard preference is not found, or if the requestor
 *   does not own the record
 */
export async function deletehealthcarePlatformMedicalDoctorAnalyticsDashboardsDashboardIdPreferencesPreferenceId(props: {
  medicalDoctor: MedicaldoctorPayload;
  dashboardId: string & tags.Format<"uuid">;
  preferenceId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Lookup preference by PK and dashboard, regardless of deleted_at
  const preference =
    await MyGlobal.prisma.healthcare_platform_dashboard_preferences.findFirst({
      where: {
        id: props.preferenceId,
        dashboard_id: props.dashboardId,
      },
    });
  if (!preference) throw new Error("Dashboard preference not found.");
  // Step 2: Owner-only deletion enforced by user_id
  if (preference.user_id !== props.medicalDoctor.id)
    throw new Error("Not authorized to erase this dashboard preference.");
  // Step 3: If already soft-deleted, idempotent and return
  if (preference.deleted_at !== null) return;
  // Step 4: Soft delete by setting deleted_at to current ISO string
  await MyGlobal.prisma.healthcare_platform_dashboard_preferences.update({
    where: { id: props.preferenceId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
