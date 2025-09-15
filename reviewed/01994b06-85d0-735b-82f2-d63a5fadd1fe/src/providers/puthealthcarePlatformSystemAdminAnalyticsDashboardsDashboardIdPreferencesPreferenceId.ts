import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDashboardPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDashboardPreference";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update analytics dashboard preferences
 * (IHealthcarePlatformDashboardPreference) for a specific dashboard and
 * preference.
 *
 * Updates an existing preference record for dashboard customization, allowing
 * users to change saved settings like theme, dashboard layout, widget
 * configuration, and personal filter states for the identified dashboard and
 * preferenceId. The operation mandates authorization to ensure that only the
 * preference owner or users with matching permissions can update the settings.
 * The request body follows the IHealthcarePlatformDashboardPreference.IUpdate
 * schema, specifying the exact configuration updates desired. The operation
 * writes to the healthcare_platform_dashboard_preferences table, ensuring audit
 * logs are maintained for all changes as per compliance requirements. On
 * success, it returns the updated IHealthcarePlatformDashboardPreference
 * object, reflecting the new state. Validation handles dashboard and preference
 * existence, authorization checks, and ensures no other preference is
 * overwritten by mistake.
 *
 * @param props - Parameters for the update operation
 * @param props.systemAdmin - Authenticated SystemadminPayload performing the
 *   update
 * @param props.dashboardId - UUID of the analytics dashboard to which this
 *   preference belongs
 * @param props.preferenceId - UUID of the user dashboard preference record to
 *   update
 * @param props.body - IHealthcarePlatformDashboardPreference.IUpdate changes
 *   (preferences_json, last_viewed_at)
 * @returns The updated dashboard preferences record
 * @throws {Error} If the specified preference or dashboard does not exist or
 *   has been deleted
 */
export async function puthealthcarePlatformSystemAdminAnalyticsDashboardsDashboardIdPreferencesPreferenceId(props: {
  systemAdmin: SystemadminPayload;
  dashboardId: string & tags.Format<"uuid">;
  preferenceId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformDashboardPreference.IUpdate;
}): Promise<IHealthcarePlatformDashboardPreference> {
  const { systemAdmin, dashboardId, preferenceId, body } = props;

  // Step 1: Fetch dashboard preference record for existence and ensure it matches the specified dashboard
  const pref =
    await MyGlobal.prisma.healthcare_platform_dashboard_preferences.findFirst({
      where: {
        id: preferenceId,
        dashboard_id: dashboardId,
        deleted_at: null,
      },
    });

  if (!pref) {
    throw new Error("Dashboard preference record not found");
  }

  // Step 2: (Authorization/ownership: systemAdmin role grants update rights per OpenAPI contract)

  // Step 3: Update only permitted fields (preferences_json, last_viewed_at, updated_at)
  const updated =
    await MyGlobal.prisma.healthcare_platform_dashboard_preferences.update({
      where: {
        id: preferenceId,
      },
      data: {
        preferences_json: body.preferences_json ?? undefined,
        last_viewed_at: body.last_viewed_at ?? undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  // Step 4: Map the updated record to the API DTO, branding dates and handling null/undefined strictly
  const result: IHealthcarePlatformDashboardPreference = {
    id: updated.id,
    dashboard_id: updated.dashboard_id,
    user_id: updated.user_id,
    preferences_json: updated.preferences_json,
    last_viewed_at:
      updated.last_viewed_at === null
        ? undefined
        : toISOStringSafe(updated.last_viewed_at),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };

  return result;
}
