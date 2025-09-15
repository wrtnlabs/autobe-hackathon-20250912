import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ISubscriptionRenewalGuardianSubscriptions } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianSubscriptions";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Retrieve subscription details by ID
 *
 * This operation fetches detailed subscription information from the database
 * identified by the subscriptionId. Access is allowed only for the subscription
 * owner.
 *
 * @param props - Object containing the authenticated user and subscription ID
 * @param props.user - Authenticated user payload
 * @param props.subscriptionId - UUID of the subscription to retrieve
 * @returns Detailed subscription information
 * @throws {Error} Unauthorized access if user is not the subscription owner
 * @throws {Error} Subscription not found if no record matches the
 *   subscriptionId
 */
export async function getsubscriptionRenewalGuardianUserSubscriptionsSubscriptionId(props: {
  user: UserPayload;
  subscriptionId: string & tags.Format<"uuid">;
}): Promise<ISubscriptionRenewalGuardianSubscriptions> {
  const { user, subscriptionId } = props;

  const subscription =
    await MyGlobal.prisma.subscription_renewal_guardian_subscriptions.findUniqueOrThrow(
      {
        where: { id: subscriptionId },
        include: {
          user: true,
          vendor: true,
          subscription_renewal_guardian_reminder_settings: true,
        },
      },
    );

  // Authorization check: Only owner user can access
  if (subscription.user_id !== user.id) {
    throw new Error("Unauthorized: You are not the owner of this subscription");
  }

  // Transform reminder settings with proper date conversions
  const reminderSettings =
    subscription.subscription_renewal_guardian_reminder_settings.map(
      (reminder) => ({
        id: reminder.id,
        subscription_id: reminder.subscription_id,
        days_before: reminder.days_before,
        channel: reminder.channel,
        created_at: toISOStringSafe(reminder.created_at),
        updated_at: toISOStringSafe(reminder.updated_at),
        deleted_at: reminder.deleted_at
          ? toISOStringSafe(reminder.deleted_at)
          : null,
      }),
    );

  return {
    id: subscription.id,
    user_id: subscription.user_id,
    vendor_id: subscription.vendor_id,
    plan_name: subscription.plan_name,
    billing_cycle: subscription.billing_cycle as
      | "DAILY"
      | "WEEKLY"
      | "MONTHLY"
      | "YEARLY",
    amount: subscription.amount,
    currency: subscription.currency,
    started_at: toISOStringSafe(subscription.started_at),
    next_renewal_at: toISOStringSafe(subscription.next_renewal_at),
    status: subscription.status as "ACTIVE" | "PAUSED" | "CANCELED",
    notes: subscription.notes ?? null,
    created_at: toISOStringSafe(subscription.created_at),
    updated_at: toISOStringSafe(subscription.updated_at),
    subscription_renewal_guardian_reminder_settings: reminderSettings,
  };
}
