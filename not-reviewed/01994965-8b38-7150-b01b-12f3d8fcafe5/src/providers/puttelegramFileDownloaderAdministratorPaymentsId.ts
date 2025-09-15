import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderPayments } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderPayments";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Updates an existing payment record in telegram_file_downloader_payments
 * table.
 *
 * This operation allows modification of payment fields such as subscription
 * plan ID, user ID, payment provider, payment status, amount, currency, payment
 * reference ID, and payment date. It requires that the payment ID exists;
 * otherwise, it throws an error.
 *
 * Dates are handled as ISO 8601 strings with the proper branding.
 *
 * @param props - Contains administrator payload, payment ID, and update body
 * @returns The updated payment record with all fields including timestamps
 * @throws Error if payment ID does not exist
 */
export async function puttelegramFileDownloaderAdministratorPaymentsId(props: {
  administrator: AdministratorPayload;
  id: string & tags.Format<"uuid">;
  body: ITelegramFileDownloaderPayments.IUpdate;
}): Promise<ITelegramFileDownloaderPayments> {
  const { id, body } = props;

  // Verify existence of payment record
  await MyGlobal.prisma.telegram_file_downloader_payments.findUniqueOrThrow({
    where: { id },
  });

  // Prepare update data with null-to-undefined conversion for required fields
  const data = {
    subscription_plan_id:
      body.subscription_plan_id === null
        ? undefined
        : body.subscription_plan_id,
    user_id: body.user_id === null ? undefined : body.user_id,
    payment_provider:
      body.payment_provider === null ? undefined : body.payment_provider,
    payment_status:
      body.payment_status === null ? undefined : body.payment_status,
    payment_amount:
      body.payment_amount === null ? undefined : body.payment_amount,
    payment_currency:
      body.payment_currency === null ? undefined : body.payment_currency,
    payment_reference_id:
      body.payment_reference_id === null
        ? undefined
        : body.payment_reference_id,
    payment_date: body.payment_date === null ? undefined : body.payment_date,
    created_at: body.created_at === null ? undefined : body.created_at,
    updated_at: body.updated_at === null ? undefined : body.updated_at,
    deleted_at: body.deleted_at === undefined ? undefined : body.deleted_at,
  };

  // Perform the update
  const updated =
    await MyGlobal.prisma.telegram_file_downloader_payments.update({
      where: { id },
      data,
    });

  // Return the updated payment record with ISO string date fields
  return {
    id: updated.id,
    subscription_plan_id: updated.subscription_plan_id,
    user_id: updated.user_id,
    payment_provider: updated.payment_provider,
    payment_status: updated.payment_status,
    payment_amount: updated.payment_amount,
    payment_currency: updated.payment_currency,
    payment_reference_id: updated.payment_reference_id,
    payment_date: toISOStringSafe(updated.payment_date),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
