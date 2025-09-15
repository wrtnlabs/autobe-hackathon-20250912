import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ISubscriptionRenewalGuardianSubscriptions } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianSubscriptions";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Create a new subscription for the authenticated user.
 *
 * This operation creates a subscription_renewal_guardian_subscriptions record
 * linked to the authenticated user. It enforces business rules like uniqueness
 * at the DB level and calculates the next renewal date based on the billing
 * cycle and start date.
 *
 * @param props - An object containing the authenticated user and subscription
 *   creation data
 * @param props.user - The authenticated user payload with user id
 * @param props.body - The subscription creation payload
 * @returns The created subscription entity
 * @throws {Error} Propagates any error from database operations such as
 *   uniqueness violation
 */
export async function postsubscriptionRenewalGuardianUserSubscriptions(props: {
  user: UserPayload;
  body: ISubscriptionRenewalGuardianSubscriptions.ICreate;
}): Promise<ISubscriptionRenewalGuardianSubscriptions> {
  const { user, body } = props;

  // Parse started_at and current time for computation
  const startedAt = body.started_at;
  const now = toISOStringSafe(new Date());

  // Convert started_at string to Date instance for calculation
  const startedAtDate = new Date(startedAt);
  let nextRenewalDate = new Date(startedAtDate.getTime());

  // Compute next_renewal_at by advancing the date until it is in the future
  while (nextRenewalDate.getTime() <= new Date().getTime()) {
    switch (body.billing_cycle) {
      case "DAILY":
        nextRenewalDate.setUTCDate(nextRenewalDate.getUTCDate() + 1);
        break;
      case "WEEKLY":
        nextRenewalDate.setUTCDate(nextRenewalDate.getUTCDate() + 7);
        break;
      case "MONTHLY":
        nextRenewalDate.setUTCMonth(nextRenewalDate.getUTCMonth() + 1);
        break;
      case "YEARLY":
        nextRenewalDate.setUTCFullYear(nextRenewalDate.getUTCFullYear() + 1);
        break;
    }
  }

  // Convert computed date to string & format
  const nextRenewalAt = toISOStringSafe(nextRenewalDate);

  // Generate UUID and timestamps
  const id = v4() as string & tags.Format<"uuid">;
  const createdAt = toISOStringSafe(new Date());
  const updatedAt = createdAt;

  // Insert into database
  const created =
    await MyGlobal.prisma.subscription_renewal_guardian_subscriptions.create({
      data: {
        id,
        user_id: user.id,
        vendor_id: body.vendor_id,
        plan_name: body.plan_name,
        billing_cycle: body.billing_cycle,
        amount: body.amount,
        currency: body.currency,
        started_at: startedAt,
        next_renewal_at: nextRenewalAt,
        status: body.status ?? "ACTIVE",
        notes: body.notes ?? null,
        created_at: createdAt,
        updated_at: updatedAt,
      },
    });

  // Return data with all date fields converted
  return {
    id: created.id,
    user_id: created.user_id,
    vendor_id: created.vendor_id,
    plan_name: created.plan_name,
    billing_cycle: created.billing_cycle,
    amount: created.amount,
    currency: created.currency,
    started_at: toISOStringSafe(created.started_at),
    next_renewal_at: toISOStringSafe(created.next_renewal_at),
    status: created.status,
    notes: created.notes ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
