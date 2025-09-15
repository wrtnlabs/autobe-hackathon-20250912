import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderTransactions } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderTransactions";
import { IPageITelegramFileDownloaderTransactions } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITelegramFileDownloaderTransactions";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Retrieves a filtered and paginated list of payment transactions from the
 * telegram_file_downloader_transactions table.
 *
 * Supports filtering by transaction type, status, user ID, and date ranges.
 * Pagination is applied with default page 1 and limit 20.
 *
 * Access restricted to administrators only.
 *
 * @param props - Object containing administrator info and search filters.
 * @param props.administrator - Authenticated administrator payload.
 * @param props.body - Filter and pagination parameters for transactions.
 * @returns Paginated list of payment transactions.
 * @throws {Error} Throws if database operation fails.
 */
export async function patchtelegramFileDownloaderAdministratorTransactions(props: {
  administrator: AdministratorPayload;
  body: ITelegramFileDownloaderTransactions.IRequest;
}): Promise<IPageITelegramFileDownloaderTransactions> {
  const { administrator, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
    ...(body.transaction_type !== undefined &&
      body.transaction_type !== null && {
        transaction_type: body.transaction_type,
      }),
    ...(body.transaction_status !== undefined &&
      body.transaction_status !== null && {
        transaction_status: body.transaction_status,
      }),
    ...(body.user_id !== undefined &&
      body.user_id !== null && {
        user_id: body.user_id,
      }),
    ...((body.date_start !== undefined && body.date_start !== null) ||
    (body.date_end !== undefined && body.date_end !== null)
      ? {
          transaction_date: {
            ...(body.date_start !== undefined && body.date_start !== null
              ? { gte: body.date_start }
              : {}),
            ...(body.date_end !== undefined && body.date_end !== null
              ? { lte: body.date_end }
              : {}),
          },
        }
      : {}),
  };

  const [transactions, total] = await Promise.all([
    MyGlobal.prisma.telegram_file_downloader_transactions.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.telegram_file_downloader_transactions.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transactions.map((tx) => ({
      id: tx.id as string & tags.Format<"uuid">,
      payment_id: tx.payment_id as string & tags.Format<"uuid">,
      user_id: tx.user_id as string & tags.Format<"uuid">,
      transaction_type: tx.transaction_type,
      transaction_status: tx.transaction_status,
      transaction_amount: tx.transaction_amount,
      transaction_date: toISOStringSafe(tx.transaction_date),
      created_at: toISOStringSafe(tx.created_at),
      updated_at: toISOStringSafe(tx.updated_at),
      deleted_at: tx.deleted_at ? toISOStringSafe(tx.deleted_at) : null,
    })),
  };
}
