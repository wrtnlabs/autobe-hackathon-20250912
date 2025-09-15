import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderTransactions } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderTransactions";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Update an existing payment transaction record.
 *
 * This function updates the specified fields of an existing transaction
 * identified by ID. Only administrators are authorized to perform this
 * operation.
 *
 * @param props - Contains the administrator payload, transaction ID, and the
 *   fields to update.
 * @returns The updated transaction entity after applying changes.
 * @throws Error if the transaction ID does not exist or the update fails.
 */
export async function puttelegramFileDownloaderAdministratorTransactionsId(props: {
  administrator: AdministratorPayload;
  id: string & tags.Format<"uuid">;
  body: ITelegramFileDownloaderTransactions.IUpdate;
}): Promise<ITelegramFileDownloaderTransactions> {
  const { administrator, id, body } = props;

  // Ensure transaction exists
  await MyGlobal.prisma.telegram_file_downloader_transactions.findUniqueOrThrow(
    { where: { id } },
  );

  // Update transaction fields
  const updated =
    await MyGlobal.prisma.telegram_file_downloader_transactions.update({
      where: { id },
      data: {
        payment_id: body.payment_id ?? undefined,
        user_id: body.user_id ?? undefined,
        transaction_type: body.transaction_type ?? undefined,
        transaction_status: body.transaction_status ?? undefined,
        transaction_amount: body.transaction_amount ?? undefined,
        transaction_date: body.transaction_date ?? undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  // Return updated transaction with proper date conversions
  return {
    id: updated.id,
    payment_id: updated.payment_id,
    user_id: updated.user_id,
    transaction_type: updated.transaction_type,
    transaction_status: updated.transaction_status,
    transaction_amount: updated.transaction_amount,
    transaction_date: toISOStringSafe(updated.transaction_date),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
