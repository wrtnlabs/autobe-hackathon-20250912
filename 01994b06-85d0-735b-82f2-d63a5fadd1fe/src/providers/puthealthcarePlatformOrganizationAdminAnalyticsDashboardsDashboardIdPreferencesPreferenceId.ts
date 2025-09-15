import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDashboardPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDashboardPreference";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update analytics dashboard preferences
 * (IHealthcarePlatformDashboardPreference) for a specific dashboard and
 * preference.
 *
 * This endpoint allows an authenticated organization admin to update a
 * dashboard preference record for a given dashboard and preferenceId, modifying
 * customization properties such as theme, layout, filter states, and widget
 * configuration. The update is allowed only by the owner of the preference or a
 * user with explicit permission (by policy, only owner is permitted here). The
 * request body defines only mutable fields (preferences_json and/or
 * last_viewed_at).
 *
 * Authorization is enforced: only the owner of the preference
 * (organizationAdmin.id matches record.user_id) may update. Audit trails are
 * maintained, and the updated_at timestamp is strictly set to "now".
 *
 * @param props - Object containing all update parameters
 * @param props.organizationAdmin - The authenticated organization admin
 *   performing the update
 * @param props.dashboardId - Dashboard UUID for which preferences are updated
 * @param props.preferenceId - Unique identifier for the preference record being
 *   updated
 * @param props.body - Object of type
 *   IHealthcarePlatformDashboardPreference.IUpdate; must specify at least one
 *   updatable field
 * @returns The updated IHealthcarePlatformDashboardPreference object reflecting
 *   new settings
 * @throws {Error} If preference not found or not active
 * @throws {Error} If attempting to update another user's preference without
 *   explicit permission
 * @throws {Error} If neither preferences_json nor last_viewed_at is specified
 *   in body
 */
export async function puthealthcarePlatformOrganizationAdminAnalyticsDashboardsDashboardIdPreferencesPreferenceId(props: {
  organizationAdmin: OrganizationadminPayload;
  dashboardId: string & tags.Format<"uuid">;
  preferenceId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformDashboardPreference.IUpdate;
}): Promise<IHealthcarePlatformDashboardPreference> {
  const { organizationAdmin, dashboardId, preferenceId, body } = props;

  // Step 1: Fetch the dashboard preference record, must match dashboard and be active
  const record =
    await MyGlobal.prisma.healthcare_platform_dashboard_preferences.findFirst({
      where: {
        id: preferenceId,
        dashboard_id: dashboardId,
        deleted_at: null,
      },
    });
  if (!record) throw new Error("Dashboard preference not found");

  // Step 2: Check ownership - org admin can only update own preference by business logic
  if (record.user_id !== organizationAdmin.id) {
    throw new Error("Unauthorized: Only owner can update this preference");
  }

  // Step 3: Validate at least one updatable field was provided
  if (
    body.preferences_json === undefined &&
    body.last_viewed_at === undefined
  ) {
    throw new Error("No updatable fields provided");
  }

  // Step 4: Prepare update
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Step 5: Update the record (only set fields present in body, skip missing)
  const updated =
    await MyGlobal.prisma.healthcare_platform_dashboard_preferences.update({
      where: { id: preferenceId },
      data: {
        preferences_json: body.preferences_json ?? undefined,
        last_viewed_at: body.last_viewed_at ?? undefined,
        updated_at: now,
      },
    });

  // Step 6: Build return object, ensuring proper date format and nullable handling
  return {
    id: updated.id,
    dashboard_id: updated.dashboard_id,
    user_id: updated.user_id,
    preferences_json: updated.preferences_json,
    last_viewed_at:
      updated.last_viewed_at !== null && updated.last_viewed_at !== undefined
        ? toISOStringSafe(updated.last_viewed_at)
        : updated.last_viewed_at === null
          ? null
          : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : updated.deleted_at === null
          ? null
          : undefined,
  };
}
