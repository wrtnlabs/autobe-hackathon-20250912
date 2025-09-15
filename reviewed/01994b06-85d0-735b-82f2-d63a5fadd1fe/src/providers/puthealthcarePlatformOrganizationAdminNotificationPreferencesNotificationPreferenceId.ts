import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotificationPreference";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update a notification preference record for a user
 * (healthcare_platform_notification_preferences table).
 *
 * This API operation updates an existing notification preference entry,
 * controlling how a user or staff receives (or mutes) specific notifications
 * (e.g., email/SMS/in-app, opt-in/out, mute window, escalation). Only
 * authorized organization administrators are allowed to update a preference for
 * users within their org context. The updated record is returned as per
 * system-wide notification delivery rules and audit policies. Authorization
 * checks ensure changes are restricted to notification preferences owned by the
 * admin's org; admin may not update out-of-scope preferences.
 *
 * @param props - The operation props.
 * @param props.organizationAdmin - The authenticated organization administrator
 *   performing the request.
 * @param props.notificationPreferenceId - The UUID of the notification
 *   preference record to update.
 * @param props.body - The update payload with enabled, mute window, or
 *   escalation_policy fields to change.
 * @returns The updated notification preference record with all fields mapped to
 *   the DTO contract.
 * @throws {Error} When the preference record does not exist, is already
 *   deleted, or does not belong to the admin's organization.
 */
export async function puthealthcarePlatformOrganizationAdminNotificationPreferencesNotificationPreferenceId(props: {
  organizationAdmin: OrganizationadminPayload;
  notificationPreferenceId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformNotificationPreference.IUpdate;
}): Promise<IHealthcarePlatformNotificationPreference> {
  const { organizationAdmin, notificationPreferenceId, body } = props;

  // 1. Fetch the existing notification preference record
  const pref =
    await MyGlobal.prisma.healthcare_platform_notification_preferences.findFirst(
      {
        where: {
          id: notificationPreferenceId,
          deleted_at: null,
        },
      },
    );
  if (!pref) {
    throw new Error("Notification preference not found or already deleted");
  }

  // 2. Authorization check: Only allow update if admin's org matches record's organization_id (or if global)
  if (
    typeof pref.organization_id === "string" &&
    pref.organization_id !== organizationAdmin.id
  ) {
    throw new Error(
      "Forbidden: Cannot modify notification preference outside your organization",
    );
  }

  // 3. Prepare the update: Only update allowed/provided fields, plus updated_at
  // Dates: If value is null, set null; if string, convert with toISOStringSafe
  const now = toISOStringSafe(new Date());
  const updateData = {
    ...(body.enabled !== undefined && { enabled: body.enabled }),
    ...(body.mute_start !== undefined && {
      mute_start: body.mute_start ?? null,
    }),
    ...(body.mute_end !== undefined && { mute_end: body.mute_end ?? null }),
    ...(body.escalation_policy !== undefined && {
      escalation_policy: body.escalation_policy ?? null,
    }),
    updated_at: now,
  };

  const updated =
    await MyGlobal.prisma.healthcare_platform_notification_preferences.update({
      where: { id: notificationPreferenceId },
      data: updateData,
    });

  // 4. Map all fields in return value per DTO (format dates, handle null/undefined)
  return {
    id: updated.id,
    user_id: updated.user_id,
    organization_id:
      typeof updated.organization_id === "string"
        ? updated.organization_id
        : undefined,
    notification_channel: updated.notification_channel,
    notification_type: updated.notification_type,
    enabled: updated.enabled,
    mute_start:
      updated.mute_start == null
        ? undefined
        : toISOStringSafe(updated.mute_start),
    mute_end:
      updated.mute_end == null ? undefined : toISOStringSafe(updated.mute_end),
    escalation_policy:
      updated.escalation_policy == null ? undefined : updated.escalation_policy,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at == null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
