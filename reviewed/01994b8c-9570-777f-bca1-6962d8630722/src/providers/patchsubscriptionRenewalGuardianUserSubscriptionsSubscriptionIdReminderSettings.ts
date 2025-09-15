import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IPageISubscriptionRenewalGuardianReminderSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageISubscriptionRenewalGuardianReminderSettings";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * List reminder settings for a subscription.
 *
 * Retrieves all active (non-deleted) reminder settings linked to a
 * subscription. Only the subscription owner can access this list.
 *
 * @param props - Object containing the authenticated user and subscription ID.
 * @param props.user - The authenticated user making the request.
 * @param props.subscriptionId - UUID of the subscription to list reminders for.
 * @returns A paginated summary list of reminder settings including id,
 *   days_before, and channel.
 * @throws {Error} Throws error if subscription is not found or user is
 *   unauthorized.
 */
export async function patchsubscriptionRenewalGuardianUserSubscriptionsSubscriptionIdReminderSettings(props: {
  user: UserPayload;
  subscriptionId: string & tags.Format<"uuid">;
}): Promise<IPageISubscriptionRenewalGuardianReminderSettings.ISummary> {
  const { user, subscriptionId } = props;

  // Find subscription and validate ownership
  const subscription =
    await MyGlobal.prisma.subscription_renewal_guardian_subscriptions.findUniqueOrThrow(
      {
        where: { id: subscriptionId },
      },
    );

  if (subscription.user_id !== user.id) {
    throw new Error("Unauthorized: You do not own this subscription");
  }

  // Retrieve active reminder settings (not soft deleted)
  const reminders =
    await MyGlobal.prisma.subscription_renewal_guardian_reminder_settings.findMany(
      {
        where: {
          subscription_id: subscriptionId,
          deleted_at: null,
        },
      },
    );

  const data = reminders.map((reminder) => ({
    id: reminder.id,
    days_before: reminder.days_before,
    channel: reminder.channel,
  }));

  // Return paginated summary
  return {
    pagination: {
      current: 1,
      limit: data.length,
      records: data.length,
      pages: 1,
    },
    data,
  };
}
