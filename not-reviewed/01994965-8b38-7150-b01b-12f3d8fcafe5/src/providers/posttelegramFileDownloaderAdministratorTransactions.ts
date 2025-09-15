import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderTransactions } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderTransactions";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Create a new payment transaction record.
 *
 * This operation allows an administrator to create a detailed transaction
 * record tied to a payment and user, capturing type, status, amounts, and
 * timestamps.
 *
 * @param props - Object containing the administrator payload and transaction
 *   creation data
 * @param props.administrator - The authenticated administrator making the
 *   request
 * @param props.body - The transaction creation data
 * @returns The newly created transaction entity
 * @throws {Error} Throws if the creation fails due to data or database errors
 */
export async function posttelegramFileDownloaderAdministratorTransactions(props: {
  administrator: AdministratorPayload;
  body: ITelegramFileDownloaderTransactions.ICreate;
}): Promise<ITelegramFileDownloaderTransactions> {
  const { administrator, body } = props;
  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const created =
    await MyGlobal.prisma.telegram_file_downloader_transactions.create({
      data: {
        id,
        payment_id: body.payment_id,
        user_id: body.user_id,
        transaction_type: body.transaction_type,
        transaction_status: body.transaction_status,
        transaction_amount: body.transaction_amount,
        transaction_date: body.transaction_date,
        created_at: now,
        updated_at: now,
      },
    });

  return {
    id: created.id,
    payment_id: created.payment_id,
    user_id: created.user_id,
    transaction_type: created.transaction_type,
    transaction_status: created.transaction_status,
    transaction_amount: created.transaction_amount,
    transaction_date: toISOStringSafe(created.transaction_date),
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
