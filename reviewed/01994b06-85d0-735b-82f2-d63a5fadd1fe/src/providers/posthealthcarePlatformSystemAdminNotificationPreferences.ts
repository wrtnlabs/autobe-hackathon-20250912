import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotificationPreference";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new notification preference entry
 * (healthcare_platform_notification_preferences table)
 *
 * This function creates a new notification preference entry, assigning
 * notification delivery rules for a user and channel/type combination. It
 * writes to the healthcare_platform_notification_preferences table. The
 * endpoint enforces uniqueness for (user_id, notification_channel,
 * notification_type):
 *
 * - If a preference already exists for the combination, throws an error
 *   (conflict).
 * - On success, returns the created preference as
 *   IHealthcarePlatformNotificationPreference, mapping all fields. All
 *   date/datetime values use string & tags.Format<'date-time'>, never native
 *   Date. No type assertions used.
 *
 * @param props - The request props containing systemAdmin payload and body
 *   (notification preference creation DTO)
 * @returns The created notification preference record
 * @throws {Error} If a notification preference for the (user_id,
 *   notification_channel, notification_type) combination already exists
 */
export async function posthealthcarePlatformSystemAdminNotificationPreferences(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformNotificationPreference.ICreate;
}): Promise<IHealthcarePlatformNotificationPreference> {
  const { body } = props;

  // Check for duplicate preference (uniqueness enforced in schema)
  const existing =
    await MyGlobal.prisma.healthcare_platform_notification_preferences.findFirst(
      {
        where: {
          user_id: body.user_id,
          notification_channel: body.notification_channel,
          notification_type: body.notification_type,
        },
      },
    );
  if (existing) {
    throw new Error(
      "Notification preference already exists for (user, channel, type) combination.",
    );
  }

  // Prepare current timestamp for created_at and updated_at
  const now = toISOStringSafe(new Date());
  // Insert new row
  const created =
    await MyGlobal.prisma.healthcare_platform_notification_preferences.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        user_id: body.user_id,
        organization_id: body.organization_id ?? undefined,
        notification_channel: body.notification_channel,
        notification_type: body.notification_type,
        enabled: body.enabled,
        mute_start: body.mute_start ?? undefined,
        mute_end: body.mute_end ?? undefined,
        escalation_policy: body.escalation_policy ?? undefined,
        created_at: now,
        updated_at: now,
      },
    });

  // Return proper DTO with branded/ISO strings for all dates, null/undefined for optionals
  return {
    id: created.id,
    user_id: created.user_id,
    organization_id: created.organization_id ?? undefined,
    notification_channel: created.notification_channel,
    notification_type: created.notification_type,
    enabled: created.enabled,
    mute_start:
      created.mute_start !== null && created.mute_start !== undefined
        ? toISOStringSafe(created.mute_start)
        : created.mute_start === null
          ? null
          : undefined,
    mute_end:
      created.mute_end !== null && created.mute_end !== undefined
        ? toISOStringSafe(created.mute_end)
        : created.mute_end === null
          ? null
          : undefined,
    escalation_policy: created.escalation_policy ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : created.deleted_at === null
          ? null
          : undefined,
  };
}
