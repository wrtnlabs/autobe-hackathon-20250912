import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { TechnicianPayload } from "../decorators/payload/TechnicianPayload";

/**
 * Erase (soft-delete) dashboard preferences
 * (IHealthcarePlatformDashboardPreference) for a given dashboard and
 * preference.
 *
 * Permanently disables a user's dashboard preference settings by marking the
 * specified preference record as deleted via the deleted_at column in the
 * healthcare_platform_dashboard_preferences table (soft delete). This disables
 * all customizations for the specified dashboard until a new preference is
 * created. Authorization is required to ensure only the owner or designated
 * admin can erase the preference record. Validation includes existence checks
 * for both dashboard and preferenceId, as well as proper permission
 * enforcement. If preference is already deleted, the operation is idempotent
 * and returns success.
 *
 * @param props - Request properties
 * @param props.technician - The authenticated technician making the request
 *   (must own the preference)
 * @param props.dashboardId - The unique identifier of the analytics dashboard
 *   for which the preference is erased
 * @param props.preferenceId - The unique identifier for the user dashboard
 *   preference record to erase
 * @returns Void
 * @throws {Error} When the preference does not exist, already deleted, or is
 *   not owned by the requesting technician
 */
export async function deletehealthcarePlatformTechnicianAnalyticsDashboardsDashboardIdPreferencesPreferenceId(props: {
  technician: TechnicianPayload;
  dashboardId: string & tags.Format<"uuid">;
  preferenceId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { technician, dashboardId, preferenceId } = props;

  // Check for existence, owner match, and not already deleted
  const existing =
    await MyGlobal.prisma.healthcare_platform_dashboard_preferences.findFirst({
      where: {
        id: preferenceId,
        dashboard_id: dashboardId,
        user_id: technician.id,
        deleted_at: null,
      },
    });
  if (!existing) {
    throw new Error(
      "Dashboard preference not found, already deleted, or not owned by this technician",
    );
  }

  // Soft delete (set deleted_at to ISO string now)
  const deletedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  await MyGlobal.prisma.healthcare_platform_dashboard_preferences.update({
    where: {
      id: preferenceId,
    },
    data: {
      deleted_at: deletedAt,
    },
  });

  // No return; operation is idempotent, error thrown if not found/not owned
}
