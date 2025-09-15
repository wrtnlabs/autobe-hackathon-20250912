import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ISubscriptionRenewalGuardianReminderSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianReminderSettings";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Create a new reminder setting for a subscription.
 *
 * This operation allows an authenticated user to create a new reminder setting
 * for a specific subscription identified by subscriptionId. The reminder
 * setting specifies how many days before a subscription renewal a reminder
 * should be sent, and via which channel (EMAIL or NONE).
 *
 * Authorization is enforced by checking that the subscription belongs to the
 * authenticated user. Uniqueness is enforced on the combination of
 * subscriptionId and days_before; duplicates result in a conflict error.
 *
 * @param props - Object containing the user payload, subscription ID, and
 *   reminder setting creation data (days_before and channel).
 * @returns The created reminder setting details including id, subscription
 *   reference, days_before, channel, and timestamps.
 * @throws {Error} When the subscription does not belong to the authenticated
 *   user (unauthorized).
 * @throws {Error} When a reminder setting for the same days_before already
 *   exists for the subscription (conflict).
 */
export async function postsubscriptionRenewalGuardianUserSubscriptionsSubscriptionIdReminderSettings(props: {
  user: UserPayload;
  subscriptionId: string & tags.Format<"uuid">;
  body: ISubscriptionRenewalGuardianReminderSettings.ICreate;
}): Promise<ISubscriptionRenewalGuardianReminderSettings> {
  const { user, subscriptionId, body } = props;

  // Verify ownership of the subscription
  const subscription =
    await MyGlobal.prisma.subscription_renewal_guardian_subscriptions.findUniqueOrThrow(
      {
        where: { id: subscriptionId },
      },
    );
  if (subscription.user_id !== user.id) {
    throw new Error("Unauthorized: You can only manage your own subscriptions");
  }

  // Check if reminder setting for the days_before already exists
  const existing =
    await MyGlobal.prisma.subscription_renewal_guardian_reminder_settings.findFirst(
      {
        where: {
          subscription_id: subscriptionId,
          days_before: body.days_before,
        },
      },
    );
  if (existing) {
    throw new Error(
      `Conflict: Reminder setting for days_before ${body.days_before} already exists`,
    );
  }

  // Current timestamp in ISO string format
  const now = toISOStringSafe(new Date());

  // Create the new reminder setting
  const created =
    await MyGlobal.prisma.subscription_renewal_guardian_reminder_settings.create(
      {
        data: {
          id: v4(),
          subscription_id: subscriptionId,
          days_before: body.days_before,
          channel: body.channel,
          created_at: now,
          updated_at: now,
        },
      },
    );

  // Return the reminder setting details with proper date formatting
  return {
    id: created.id,
    subscription_id: created.subscription_id,
    days_before: created.days_before,
    channel: created.channel,
    created_at: created.created_at as string & tags.Format<"date-time">,
    updated_at: created.updated_at as string & tags.Format<"date-time">,
    deleted_at: created.deleted_at
      ? (created.deleted_at as string & tags.Format<"date-time">)
      : null,
  };
}
