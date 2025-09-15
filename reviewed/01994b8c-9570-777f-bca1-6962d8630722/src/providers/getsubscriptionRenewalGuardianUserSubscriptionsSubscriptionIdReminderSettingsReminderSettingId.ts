import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ISubscriptionRenewalGuardianReminderSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianReminderSettings";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Get a reminder setting by ID for a subscription.
 *
 * Retrieves detailed information about a specific reminder setting attached to
 * a subscription. This operation ensures users can view exact configurations
 * for notifications about upcoming renewals.
 *
 * Authorization requires the user to be the owner of the subscription and
 * reminder setting.
 *
 * @param props - Object containing authenticated user info and identifiers
 * @param props.user - The authenticated user requesting access
 * @param props.subscriptionId - UUID of the subscription
 * @param props.reminderSettingId - UUID of the reminder setting
 * @returns The detailed reminder setting record conforming to Prisma schema
 * @throws {Error} When subscription not found or unauthorized access
 * @throws {Error} When reminder setting is not found
 */
export async function getsubscriptionRenewalGuardianUserSubscriptionsSubscriptionIdReminderSettingsReminderSettingId(props: {
  user: UserPayload;
  subscriptionId: string & tags.Format<"uuid">;
  reminderSettingId: string & tags.Format<"uuid">;
}): Promise<ISubscriptionRenewalGuardianReminderSettings> {
  const { user, subscriptionId, reminderSettingId } = props;

  // Verify ownership of subscription
  const subscription =
    await MyGlobal.prisma.subscription_renewal_guardian_subscriptions.findFirst(
      {
        where: {
          id: subscriptionId,
          user_id: user.id,
        },
      },
    );
  if (subscription === null) {
    throw new Error("Unauthorized: Subscription not found or access denied");
  }

  // Find reminder setting
  const reminderSetting =
    await MyGlobal.prisma.subscription_renewal_guardian_reminder_settings.findFirst(
      {
        where: {
          id: reminderSettingId,
          subscription_id: subscriptionId,
        },
      },
    );

  if (reminderSetting === null) {
    throw new Error("Reminder setting not found");
  }

  // Return with proper date conversions
  return {
    id: reminderSetting.id,
    subscription_id: reminderSetting.subscription_id,
    days_before: reminderSetting.days_before,
    channel: reminderSetting.channel,
    created_at: toISOStringSafe(reminderSetting.created_at),
    updated_at: toISOStringSafe(reminderSetting.updated_at),
    deleted_at: reminderSetting.deleted_at
      ? toISOStringSafe(reminderSetting.deleted_at)
      : null,
  };
}
