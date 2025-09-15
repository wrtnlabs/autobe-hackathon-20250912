import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderPayment";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Retrieve detailed payment information by unique payment ID.
 *
 * This operation fetches the payment record including fields such as payment
 * amount, currency, status, provider, associated subscription plan, and paying
 * user.
 *
 * Authorization: Only authenticated administrators can access this operation.
 *
 * @param props - Object containing administrator payload and payment ID.
 * @param props.administrator - Authenticated administrator making the request.
 * @param props.id - Unique identifier of the payment to retrieve.
 * @returns Detailed payment record conforming to
 *   ITelegramFileDownloaderPayment.
 * @throws {Error} Throws if the payment record does not exist.
 */
export async function gettelegramFileDownloaderAdministratorPaymentsId(props: {
  administrator: AdministratorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ITelegramFileDownloaderPayment> {
  const { administrator, id } = props;

  const payment =
    await MyGlobal.prisma.telegram_file_downloader_payments.findUniqueOrThrow({
      where: { id },
    });

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
