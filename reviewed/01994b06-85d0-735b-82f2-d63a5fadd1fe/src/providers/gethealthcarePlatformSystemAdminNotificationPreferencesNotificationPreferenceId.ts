import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotificationPreference";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve details of a specific notification preference by its ID
 * (healthcare_platform_notification_preferences table)
 *
 * This endpoint returns full details for a single notification preference
 * record, identified by notificationPreferenceId. Each notification preference
 * governs whether a user or organization receives a certain type of
 * notification over a particular channel (email, sms, in-app, etc.). The
 * healthcare_platform_notification_preferences table includes preferences for
 * mute windows, escalation handling, and enabled status.
 *
 * Security: Only authenticated system admins (systemAdmin role) are authorized
 * to access this endpoint. Attempting to fetch a non-existent or deleted
 * preference will return a 404 error.
 *
 * @param props - Request properties
 * @param props.systemAdmin - The authenticated systemAdmin making the request
 * @param props.notificationPreferenceId - The unique identifier of the
 *   notification preference to retrieve
 * @returns Full notification preference details for the specified ID
 * @throws {Error} When the notification preference is not found or has been
 *   deleted
 */
export async function gethealthcarePlatformSystemAdminNotificationPreferencesNotificationPreferenceId(props: {
  systemAdmin: SystemadminPayload;
  notificationPreferenceId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformNotificationPreference> {
  const { notificationPreferenceId } = props;
  const preference =
    await MyGlobal.prisma.healthcare_platform_notification_preferences.findFirst(
      {
        where: {
          id: notificationPreferenceId,
          deleted_at: null,
        },
      },
    );

  if (!preference) {
    throw new Error("Notification preference not found");
  }

  return {
    id: preference.id,
    user_id: preference.user_id,
    organization_id: preference.organization_id ?? undefined,
    notification_channel: preference.notification_channel,
    notification_type: preference.notification_type,
    enabled: preference.enabled,
    mute_start:
      preference.mute_start === null || preference.mute_start === undefined
        ? preference.mute_start
        : toISOStringSafe(preference.mute_start),
    mute_end:
      preference.mute_end === null || preference.mute_end === undefined
        ? preference.mute_end
        : toISOStringSafe(preference.mute_end),
    escalation_policy: preference.escalation_policy ?? undefined,
    created_at: toISOStringSafe(preference.created_at),
    updated_at: toISOStringSafe(preference.updated_at),
    deleted_at:
      preference.deleted_at === null || preference.deleted_at === undefined
        ? preference.deleted_at
        : toISOStringSafe(preference.deleted_at),
  };
}
