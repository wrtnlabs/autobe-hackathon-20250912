import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderPayment";
import { EnduserPayload } from "../decorators/payload/EnduserPayload";

/**
 * Create a new payment record for a user subscription event.
 *
 * This endpoint allows an authenticated endUser to record a payment
 * corresponding to a subscribed plan. The payment includes metadata such as
 * provider, status, amount, currency, reference ID, and timestamps.
 *
 * Authorization requires the user_id in the request body to match the
 * authenticated endUser's ID.
 *
 * The subscription plan must exist and be active.
 *
 * @param props - The parameters containing the authenticated endUser and the
 *   payment creation body.
 * @param props.endUser - The authenticated endUser making the payment record.
 * @param props.body - The data required to create a new payment record.
 * @returns The created payment record including all relevant fields.
 * @throws {Error} If the user_id does not match the authenticated endUser.
 * @throws {Error} If the subscription plan does not exist or is inactive.
 */
export async function posttelegramFileDownloaderEndUserPayments(props: {
  endUser: EnduserPayload;
  body: ITelegramFileDownloaderPayment.ICreate;
}): Promise<ITelegramFileDownloaderPayment> {
  const now = toISOStringSafe(new Date());

  if (props.body.user_id !== props.endUser.id) {
    throw new Error(
      "Unauthorized: user_id must match authenticated endUser id.",
    );
  }

  const subscriptionPlan =
    await MyGlobal.prisma.telegram_file_downloader_subscription_plans.findUnique(
      {
        where: { id: props.body.subscription_plan_id },
      },
    );

  if (!subscriptionPlan) {
    throw new Error("Subscription plan not found.");
  }

  if (subscriptionPlan.status !== "active") {
    throw new Error("Subscription plan is not active.");
  }

  const created =
    await MyGlobal.prisma.telegram_file_downloader_payments.create({
      data: {
        id: v4(),
        subscription_plan_id: props.body.subscription_plan_id,
        user_id: props.body.user_id,
        payment_provider: props.body.payment_provider,
        payment_status: props.body.payment_status,
        payment_amount: props.body.payment_amount,
        payment_currency: props.body.payment_currency,
        payment_reference_id: props.body.payment_reference_id,
        payment_date: toISOStringSafe(props.body.payment_date),
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  return {
    id: created.id as string & tags.Format<"uuid">,
    subscription_plan_id: created.subscription_plan_id as string &
      tags.Format<"uuid">,
    user_id: created.user_id as string & tags.Format<"uuid">,
    payment_provider: created.payment_provider,
    payment_status: created.payment_status,
    payment_amount: created.payment_amount,
    payment_currency: created.payment_currency,
    payment_reference_id: created.payment_reference_id,
    payment_date: toISOStringSafe(created.payment_date),
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
