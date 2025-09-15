import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Delete a subscription permanently from the database.
 *
 * This operation performs a hard delete since no soft delete field exists. Only
 * the subscription owner (authenticated user) can delete their subscription.
 *
 * @param props - Object containing the authenticated user and subscription ID.
 * @param props.user - Authenticated user payload performing the deletion.
 * @param props.subscriptionId - UUID of the subscription to delete.
 * @returns Void
 * @throws {Error} If the subscription is not found.
 * @throws {Error} If the user is not the owner of the subscription.
 */
export async function deletesubscriptionRenewalGuardianUserSubscriptionsSubscriptionId(props: {
  user: UserPayload;
  subscriptionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { user, subscriptionId } = props;

  const subscription =
    await MyGlobal.prisma.subscription_renewal_guardian_subscriptions.findUnique(
      {
        where: { id: subscriptionId },
      },
    );

  if (!subscription) throw new Error("Subscription not found");

  if (subscription.user_id !== user.id) throw new Error("Forbidden");

  await MyGlobal.prisma.subscription_renewal_guardian_subscriptions.delete({
    where: { id: subscriptionId },
  });
}
