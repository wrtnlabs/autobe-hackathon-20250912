import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderPayment";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Retrieves detailed payment information for the authenticated developer.
 *
 * This function finds a payment record by its unique ID and ensures the payment
 * belongs to the requesting developer. It returns full payment details with
 * correctly formatted timestamps.
 *
 * @param props - Object containing the developer's authenticated payload and
 *   the payment ID.
 * @param props.developer - The authenticated developer making the request.
 * @param props.id - UUID of the payment to retrieve.
 * @returns The detailed payment record corresponding to the given ID.
 * @throws {Error} If the payment does not belong to the developer or is not
 *   found.
 */
export async function gettelegramFileDownloaderDeveloperPaymentsId(props: {
  developer: DeveloperPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ITelegramFileDownloaderPayment> {
  const { developer, id } = props;

  const payment =
    await MyGlobal.prisma.telegram_file_downloader_payments.findUniqueOrThrow({
      where: { id },
    });

  if (payment.user_id !== developer.id) {
    throw new Error(
      "Unauthorized: You can only access your own payment records",
    );
  }

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
