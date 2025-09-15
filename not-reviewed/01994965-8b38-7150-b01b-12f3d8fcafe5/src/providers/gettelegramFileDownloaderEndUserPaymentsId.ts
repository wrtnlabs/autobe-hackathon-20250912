import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderPayment";
import { EnduserPayload } from "../decorators/payload/EnduserPayload";

/**
 * Retrieves detailed payment information for a specific payment record by ID.
 *
 * This operation ensures the payment belongs to the authenticated endUser. If
 * not found or unauthorized, throws an error.
 *
 * @param props - Object containing authenticated endUser and payment ID
 * @param props.endUser - Authenticated endUser's payload containing user ID
 * @param props.id - Payment record unique identifier
 * @returns Detailed payment record conforming to ITelegramFileDownloaderPayment
 * @throws {Error} Throws if payment not found or access is denied
 */
export async function gettelegramFileDownloaderEndUserPaymentsId(props: {
  endUser: EnduserPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ITelegramFileDownloaderPayment> {
  const payment =
    await MyGlobal.prisma.telegram_file_downloader_payments.findFirst({
      where: {
        id: props.id,
        user_id: props.endUser.id,
      },
    });

  if (!payment) throw new Error("Payment not found or access denied");

  return {
    id: payment.id,
    subscription_plan_id: payment.subscription_plan_id,
    user_id: payment.user_id,
    payment_provider: payment.payment_provider,
    payment_status: payment.payment_status,
    payment_amount: payment.payment_amount,
    payment_currency: payment.payment_currency,
    payment_reference_id: payment.payment_reference_id,
    payment_date: toISOStringSafe(payment.payment_date),
    created_at: toISOStringSafe(payment.created_at),
    updated_at: toISOStringSafe(payment.updated_at),
    deleted_at: payment.deleted_at ? toISOStringSafe(payment.deleted_at) : null,
  };
}
