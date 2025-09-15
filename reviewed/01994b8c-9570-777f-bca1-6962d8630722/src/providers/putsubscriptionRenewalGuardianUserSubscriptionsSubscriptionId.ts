import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ISubscriptionRenewalGuardianSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianSubscription";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Update an existing subscription in the system. This operation allows users to
 * modify subscription details such as billing cycle, amount, currency,
 * subscription start date, status (ACTIVE, PAUSED), notes, and next renewal
 * date. The subscription status supports business rules: transitions between
 * ACTIVE and PAUSED are allowed, while CANCELED subscriptions are terminal and
 * immutable.
 *
 * Authorization requires the user to be the owner of the subscription.
 * Attempting to modify a CANCELED subscription is rejected.
 *
 * The system enforces uniqueness on (user_id, vendor_id, plan_name) and
 * validates all inputs. Updating billing_cycle, started_at, or status
 * recalculates next_renewal_at as the earliest date strictly greater than
 * current UTC time by advancing started_at by billing cycles.
 *
 * @param props - The input parameter containing user info, subscription ID, and
 *   update body
 * @returns The updated subscription entity with all details
 * @throws {Error} When subscription not found, unauthorized, canceled, or
 *   uniqueness violation occurs
 */
export async function putsubscriptionRenewalGuardianUserSubscriptionsSubscriptionId(props: {
  user: UserPayload;
  subscriptionId: string & tags.Format<"uuid">;
  body: ISubscriptionRenewalGuardianSubscription.IUpdate;
}): Promise<ISubscriptionRenewalGuardianSubscription> {
  const { user, subscriptionId, body } = props;

  // Fetch subscription and check ownership
  const subscription =
    await MyGlobal.prisma.subscription_renewal_guardian_subscriptions.findUnique(
      {
        where: { id: subscriptionId },
      },
    );

  if (!subscription) throw new Error("Subscription not found");

  if (subscription.user_id !== user.id)
    throw new Error("Unauthorized: not subscription owner");

  // Check if subscription is CANCELED
  if (subscription.status === "CANCELED") {
    throw new Error("Cannot modify a CANCELED subscription");
  }

  // Determine if critical fields changed
  const billingCycleChanged =
    body.billing_cycle !== undefined &&
    body.billing_cycle !== null &&
    body.billing_cycle !== subscription.billing_cycle;
  const startedAtChanged =
    body.started_at !== undefined &&
    body.started_at !== null &&
    body.started_at !== toISOStringSafe(subscription.started_at);
  const statusChanged =
    body.status !== undefined &&
    body.status !== null &&
    body.status !== subscription.status;

  // Prepare next_renewal_at recalculation if needed
  let next_renewal_at = subscription.next_renewal_at as string &
    tags.Format<"date-time">;

  if (billingCycleChanged || startedAtChanged || statusChanged) {
    // Recalculate next_renewal_at
    // Calculate based on billing cycle starting from started_at
    const started_at_str =
      body.started_at ?? toISOStringSafe(subscription.started_at);

    // Convert started_at string to Date object only internally
    const started_at_date = new Date(started_at_str);
    const now = new Date();

    // Advance started_at by intervals until > now
    let nextDate = new Date(started_at_date.getTime());

    switch (body.billing_cycle ?? subscription.billing_cycle) {
      case "DAILY":
        while (nextDate <= now) nextDate.setDate(nextDate.getDate() + 1);
        break;
      case "WEEKLY":
        while (nextDate <= now) nextDate.setDate(nextDate.getDate() + 7);
        break;
      case "MONTHLY":
        while (nextDate <= now) nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case "YEARLY":
        while (nextDate <= now)
          nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      default:
        throw new Error("Invalid billing_cycle value");
    }

    next_renewal_at = toISOStringSafe(nextDate);
  }

  // Enforce uniqueness of (user_id, vendor_id, plan_name)
  // Check if there's another subscription
  const conflict =
    await MyGlobal.prisma.subscription_renewal_guardian_subscriptions.findFirst(
      {
        where: {
          user_id: user.id,
          vendor_id:
            body.vendor_id !== undefined && body.vendor_id !== null
              ? body.vendor_id
              : subscription.vendor_id,
          plan_name:
            body.plan_name !== undefined && body.plan_name !== null
              ? body.plan_name
              : subscription.plan_name,
          NOT: { id: subscription.id },
        },
      },
    );

  if (conflict) {
    throw new Error(
      "Another subscription with the same user_id, vendor_id, and plan_name exists",
    );
  }

  // Update subscription
  const updated =
    await MyGlobal.prisma.subscription_renewal_guardian_subscriptions.update({
      where: { id: subscriptionId },
      data: {
        vendor_id:
          body.vendor_id === null
            ? null
            : (body.vendor_id ?? subscription.vendor_id),
        plan_name:
          body.plan_name === null
            ? null
            : (body.plan_name ?? subscription.plan_name),
        billing_cycle:
          body.billing_cycle === null
            ? null
            : (body.billing_cycle ?? subscription.billing_cycle),
        amount:
          body.amount === null ? null : (body.amount ?? subscription.amount),
        currency:
          body.currency === null
            ? null
            : (body.currency ?? subscription.currency),
        started_at:
          body.started_at === null
            ? null
            : (body.started_at ?? toISOStringSafe(subscription.started_at)),
        next_renewal_at: next_renewal_at,
        status:
          body.status === null ? null : (body.status ?? subscription.status),
        notes: body.notes ?? subscription.notes ?? null,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  // Return updated subscription converting Date to ISO string (already string from Prisma)
  return {
    id: updated.id,
    user_id: updated.user_id,
    vendor_id: updated.vendor_id,
    plan_name: updated.plan_name,
    billing_cycle: updated.billing_cycle as
      | "DAILY"
      | "WEEKLY"
      | "MONTHLY"
      | "YEARLY",
    amount: updated.amount,
    currency: updated.currency,
    started_at: updated.started_at as string & tags.Format<"date-time">,
    next_renewal_at: updated.next_renewal_at as string &
      tags.Format<"date-time">,
    status: updated.status as "ACTIVE" | "PAUSED" | "CANCELED",
    notes: updated.notes ?? null,
    created_at: updated.created_at as string & tags.Format<"date-time">,
    updated_at: updated.updated_at as string & tags.Format<"date-time">,
  };
}
