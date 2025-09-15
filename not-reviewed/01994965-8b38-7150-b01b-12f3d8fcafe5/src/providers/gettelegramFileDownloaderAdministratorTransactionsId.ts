import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderTransactions } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderTransactions";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Retrieve payment transaction details by transaction ID.
 *
 * This operation fetches detailed information about a specific payment
 * transaction identified by its UUID. The returned data includes transaction
 * status, type, amounts, associated user and payment IDs, and timestamps for
 * auditing. Access is restricted to administrators.
 *
 * @param props - Object containing administrator authentication and transaction
 *   ID
 * @param props.administrator - Authenticated administrator payload
 * @param props.id - UUID of the payment transaction to retrieve
 * @returns Detailed information about the specified payment transaction
 * @throws {Error} Throws if no transaction with the given ID is found
 */
export async function gettelegramFileDownloaderAdministratorTransactionsId(props: {
  administrator: AdministratorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ITelegramFileDownloaderTransactions> {
  const { administrator, id } = props;

  const transaction =
    await MyGlobal.prisma.telegram_file_downloader_transactions.findUniqueOrThrow(
      {
        where: {
          id,
          deleted_at: null,
        },
      },
    );

  return {
    id: transaction.id,
    payment_id: transaction.payment_id,
    user_id: transaction.user_id,
    transaction_type: transaction.transaction_type,
    transaction_status: transaction.transaction_status,
    transaction_amount: transaction.transaction_amount,
    transaction_date: toISOStringSafe(transaction.transaction_date),
    created_at: toISOStringSafe(transaction.created_at),
    updated_at: toISOStringSafe(transaction.updated_at),
    deleted_at: transaction.deleted_at
      ? toISOStringSafe(transaction.deleted_at)
      : null,
  };
}
