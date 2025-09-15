import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ReceptionistPayload } from "../decorators/payload/ReceptionistPayload";

/**
 * Erase (soft-delete) dashboard preferences
 * (IHealthcarePlatformDashboardPreference) for a given dashboard and
 * preference.
 *
 * Permanently disables a receptionist user's analytics dashboard preference
 * settings by marking the specified preference record as deleted (soft delete,
 * via the deleted_at column in the healthcare_platform_dashboard_preferences
 * table). This disables all customizations for the specified dashboard until a
 * new preference is created. Authorization is required -- only the owner
 * (authenticated receptionist) may erase the preference. The operation is
 * idempotent: if the record is already deleted, no error is thrown.
 *
 * @param props - Operation properties
 * @param props.receptionist - Authenticated ReceptionistPayload (requesting
 *   user)
 * @param props.dashboardId - UUID of the analytics dashboard
 * @param props.preferenceId - UUID of the preference record to erase
 * @returns Void
 * @throws {Error} If no matching (owned) preference exists
 */
export async function deletehealthcarePlatformReceptionistAnalyticsDashboardsDashboardIdPreferencesPreferenceId(props: {
  receptionist: ReceptionistPayload;
  dashboardId: string & tags.Format<"uuid">;
  preferenceId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { receptionist, dashboardId, preferenceId } = props;
  // 1. Find preference by id, dashboard, user (must be owned by requester)
  const preference =
    await MyGlobal.prisma.healthcare_platform_dashboard_preferences.findFirst({
      where: {
        id: preferenceId,
        dashboard_id: dashboardId,
        user_id: receptionist.id,
      },
    });
  if (!preference)
    throw new Error(
      "Preference not found or not authorized (ownership required)",
    );
  // 2. If already soft-deleted, treat as idempotent
  if (preference.deleted_at !== null) return;
  // 3. Soft-delete it
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.healthcare_platform_dashboard_preferences.update({
    where: {
      id: preferenceId,
    },
    data: {
      deleted_at: now,
    },
  });
}
