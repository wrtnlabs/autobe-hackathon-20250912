import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderPayment";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Create a new payment record for a user subscription event.
 *
 * Records payment metadata including payment provider, status, amounts, and
 * timestamps. Only an authenticated administrator user can perform this
 * operation.
 *
 * @param props - Object containing the authenticated administrator and the
 *   payment creation data
 * @param props.administrator - Authenticated administrator performing the
 *   operation
 * @param props.body - Payment creation data with required fields
 * @returns The newly created payment record with all relevant fields
 * @throws {Error} Throws if database operation fails or required fields are
 *   missing
 */
export async function posttelegramFileDownloaderAdministratorPayments(props: {
  administrator: AdministratorPayload;
  body: ITelegramFileDownloaderPayment.ICreate;
}): Promise<ITelegramFileDownloaderPayment> {
  const { administrator, body } = props;

  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const created =
    await MyGlobal.prisma.telegram_file_downloader_payments.create({
      data: {
        id,
        subscription_plan_id: body.subscription_plan_id,
        user_id: body.user_id,
        payment_provider: body.payment_provider,
        payment_status: body.payment_status,
        payment_amount: body.payment_amount,
        payment_currency: body.payment_currency,
        payment_reference_id: body.payment_reference_id,
        payment_date: body.payment_date,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  return {
    id: created.id,
    subscription_plan_id: created.subscription_plan_id,
    user_id: created.user_id,
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
