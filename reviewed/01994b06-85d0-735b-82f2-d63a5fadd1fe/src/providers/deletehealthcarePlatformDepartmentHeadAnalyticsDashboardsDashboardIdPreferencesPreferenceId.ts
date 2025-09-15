import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Erase (soft-delete) dashboard preferences
 * (IHealthcarePlatformDashboardPreference) for a given dashboard and
 * preference.
 *
 * Permanently disables a user's dashboard preference settings by marking the
 * specified preference record as deleted via the deleted_at column in the
 * healthcare_platform_dashboard_preferences table (soft delete). This disables
 * all customizations for the specified dashboard until a new preference is
 * created. Authorization is strictly enforced: only the owner (the department
 * head user) may erase their preference record. If the preference is already
 * deleted, the operation is idempotent and returns success. If neither found
 * nor authorized, appropriate errors are thrown.
 *
 * @param props - Object containing:
 *
 *   - DepartmentHead: The authenticated department head user performing the request
 *   - DashboardId: The UUID of the target analytics dashboard
 *   - PreferenceId: The UUID of the dashboard preference record to erase
 *
 * @returns Void (no content returned)
 * @throws {Error} When the preference record does not exist
 * @throws {Error} When an unauthorized user attempts the operation
 */
export async function deletehealthcarePlatformDepartmentHeadAnalyticsDashboardsDashboardIdPreferencesPreferenceId(props: {
  departmentHead: DepartmentheadPayload;
  dashboardId: string & tags.Format<"uuid">;
  preferenceId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { departmentHead, dashboardId, preferenceId } = props;

  const preference =
    await MyGlobal.prisma.healthcare_platform_dashboard_preferences.findFirst({
      where: {
        id: preferenceId,
        dashboard_id: dashboardId,
      },
    });
  if (!preference) {
    throw new Error("Preference not found");
  }
  if (preference.user_id !== departmentHead.id) {
    throw new Error("Forbidden: Only the owner can delete this preference");
  }
  if (preference.deleted_at !== null) {
    return;
  }
  await MyGlobal.prisma.healthcare_platform_dashboard_preferences.update({
    where: { id: preferenceId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
