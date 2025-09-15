import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ISubscriptionRenewalGuardianReminderSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianReminderSettings";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Updates an existing reminder setting for a subscription owned by the
 * authenticated user.
 *
 * This function verifies that the subscription specified by subscriptionId
 * belongs to the current user. It then checks for uniqueness of the days_before
 * value within the user's other reminder settings for that subscription. If
 * uniqueness is maintained, updates the reminder setting and returns the
 * updated entity including timestamps.
 *
 * @param props - Object containing user payload, subscriptionId,
 *   reminderSettingId, and update body
 * @param props.user - Authenticated user payload
 * @param props.subscriptionId - UUID of the subscription to which the reminder
 *   setting belongs
 * @param props.reminderSettingId - UUID of the reminder setting to update
 * @param props.body - Update data containing days_before and channel
 * @returns The updated reminder setting entity
 * @throws {Error} Unauthorized if the subscription does not belong to the user
 * @throws {Error} Conflict if days_before uniqueness constraint is violated
 */
export async function putsubscriptionRenewalGuardianUserSubscriptionsSubscriptionIdReminderSettingsReminderSettingId(props: {
  user: UserPayload;
  subscriptionId: string & tags.Format<"uuid">;
  reminderSettingId: string & tags.Format<"uuid">;
  body: ISubscriptionRenewalGuardianReminderSettings.IUpdate;
}): Promise<ISubscriptionRenewalGuardianReminderSettings> {
  const { user, subscriptionId, reminderSettingId, body } = props;

  const subscription =
    await MyGlobal.prisma.subscription_renewal_guardian_subscriptions.findUniqueOrThrow(
      {
        where: { id: subscriptionId },
      },
    );

  if (subscription.user_id !== user.id) {
    throw new Error("Unauthorized: subscription ownership mismatch");
  }

  const conflict =
    await MyGlobal.prisma.subscription_renewal_guardian_reminder_settings.findFirst(
      {
        where: {
          subscription_id: subscriptionId,
          days_before: body.days_before,
          id: { not: reminderSettingId },
          deleted_at: null,
        },
      },
    );

  if (conflict) {
    throw new Error("Conflict: days_before must be unique per subscription");
  }

  const updated =
    await MyGlobal.prisma.subscription_renewal_guardian_reminder_settings.update(
      {
        where: { id: reminderSettingId },
        data: {
          days_before: body.days_before,
          channel: body.channel,
          updated_at: toISOStringSafe(new Date()),
        },
      },
    );

  return {
    id: updated.id,
    subscription_id: updated.subscription_id,
    days_before: updated.days_before,
    channel: updated.channel,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
