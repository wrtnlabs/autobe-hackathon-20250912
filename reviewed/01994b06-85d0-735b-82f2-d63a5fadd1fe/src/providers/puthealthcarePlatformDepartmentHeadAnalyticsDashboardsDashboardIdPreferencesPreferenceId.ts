import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDashboardPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDashboardPreference";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Update analytics dashboard preferences for a specific dashboard and
 * preference
 *
 * This operation updates an existing dashboard preferences record for a given
 * analytics dashboard and preferenceId. It modifies the stored customization
 * parameters such as user theme, layout, filter preferences, and widget states
 * for the targeted dashboard, as defined by the
 * healthcare_platform_dashboard_preferences table. Only the owner of the
 * preferences or a user with granted permission can update these settings.
 *
 * - Only the preference owner (user_id matched to departmentHead.id) can perform
 *   update
 * - Validates existence and ownership; throws error if not found or unauthorized
 * - Updates only the allowed fields (preferences_json, last_viewed_at), sets
 *   updated_at to now, and preserves compliance/audit fields
 * - Returns the full updated IHealthcarePlatformDashboardPreference object with
 *   all required and optional fields, including consistent date conversions
 *
 * @param props - Update request: departmentHead (auth context), dashboardId
 *   (target dashboard), preferenceId (target preference), and body (update
 *   input)
 * @returns The updated dashboard preferences record, with all fields and
 *   date/timestamp properties as `string & tags.Format<'date-time'>`
 * @throws {Error} If the dashboard preference does not exist, is soft-deleted,
 *   or is not owned/authorized by the caller
 */
export async function puthealthcarePlatformDepartmentHeadAnalyticsDashboardsDashboardIdPreferencesPreferenceId(props: {
  departmentHead: DepartmentheadPayload;
  dashboardId: string & tags.Format<"uuid">;
  preferenceId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformDashboardPreference.IUpdate;
}): Promise<IHealthcarePlatformDashboardPreference> {
  // 1. Lookup preference and validate ownership & existence
  const preference =
    await MyGlobal.prisma.healthcare_platform_dashboard_preferences.findFirst({
      where: {
        id: props.preferenceId,
        dashboard_id: props.dashboardId,
        deleted_at: null,
      },
    });
  if (!preference) throw new Error("Dashboard preference not found");
  if (preference.user_id !== props.departmentHead.id)
    throw new Error(
      "Unauthorized: Only the preference owner can update these settings",
    );

  // 2. Determine update fields (only what's provided in body)
  const updateFields: {
    preferences_json?: string;
    last_viewed_at?: string | null;
    updated_at: string;
  } = {
    ...(props.body.preferences_json !== undefined && {
      preferences_json: props.body.preferences_json,
    }),
    ...(props.body.last_viewed_at !== undefined && {
      last_viewed_at: props.body.last_viewed_at ?? null,
    }),
    // Always update timestamp
    updated_at: toISOStringSafe(new Date()),
  };

  // 3. Issue the update
  const updated =
    await MyGlobal.prisma.healthcare_platform_dashboard_preferences.update({
      where: { id: props.preferenceId },
      data: updateFields,
    });

  // 4. Return DTO-per-contract, ensuring branding and nulls/optionals handled strictly natively
  return {
    id: updated.id,
    dashboard_id: updated.dashboard_id,
    user_id: updated.user_id,
    preferences_json: updated.preferences_json,
    last_viewed_at: updated.last_viewed_at
      ? toISOStringSafe(updated.last_viewed_at)
      : updated.last_viewed_at, // handles null/undefined
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : updated.deleted_at,
  };
}
