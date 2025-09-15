import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Erases (soft-deletes) dashboard preferences for a given dashboard and
 * preference record.
 *
 * This operation performs a soft delete by setting the deleted_at field in the
 * healthcare_platform_dashboard_preferences table for the specified
 * preferenceId and dashboardId. The record remains for audit/compliance, but
 * the preference is disabled until recreated. Only accessible by system admin
 * (SystemadminPayload).
 *
 * Existence and not-already-deleted checks are enforced; throws Error if not
 * found or already deleted. All date/datetime values are handled as string &
 * tags.Format<'date-time'> via toISOStringSafe.
 *
 * @param props - Function argument object
 * @param props.systemAdmin - Authenticated system admin JWT payload
 * @param props.dashboardId - UUID of the analytics dashboard
 * @param props.preferenceId - UUID of the dashboard preference to erase
 * @returns Void
 * @throws {Error} If preference does not exist or is already deleted
 */
export async function deletehealthcarePlatformSystemAdminAnalyticsDashboardsDashboardIdPreferencesPreferenceId(props: {
  systemAdmin: SystemadminPayload;
  dashboardId: string & tags.Format<"uuid">;
  preferenceId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, dashboardId, preferenceId } = props;

  // Existence and already-deleted check (deleted_at = null)
  const preference =
    await MyGlobal.prisma.healthcare_platform_dashboard_preferences.findFirst({
      where: {
        id: preferenceId,
        dashboard_id: dashboardId,
        deleted_at: null,
      },
    });
  if (!preference) {
    throw new Error("Dashboard preference not found or already deleted");
  }

  // Soft-delete: set deleted_at to now (as string & tags.Format<'date-time'>)
  await MyGlobal.prisma.healthcare_platform_dashboard_preferences.update({
    where: { id: preferenceId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });

  // No return value (void)
}
