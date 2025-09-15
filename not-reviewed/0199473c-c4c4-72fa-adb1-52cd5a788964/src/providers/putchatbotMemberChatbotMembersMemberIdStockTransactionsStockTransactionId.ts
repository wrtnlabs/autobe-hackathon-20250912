import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotStockTransactions } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotStockTransactions";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Update an existing stock transaction for a chatbot member.
 *
 * This operation allows an authenticated chatbot member to update their own
 * stock transaction record. It enforces ownership checks to prevent
 * unauthorized access.
 *
 * Only the fields specified in the request body will be updated; others remain
 * unchanged. Timestamps are handled as ISO 8601 formatted strings.
 *
 * @param props - Properties including the authenticated member, memberId,
 *   stockTransactionId, and update body
 * @returns The updated stock transaction record
 * @throws {Error} When the stock transaction does not exist or the user is
 *   unauthorized
 */
export async function putchatbotMemberChatbotMembersMemberIdStockTransactionsStockTransactionId(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
  stockTransactionId: string & tags.Format<"uuid">;
  body: IChatbotStockTransactions.IUpdate;
}): Promise<IChatbotStockTransactions> {
  const { member, stockTransactionId, body } = props;

  const existing =
    await MyGlobal.prisma.chatbot_stock_transactions.findUniqueOrThrow({
      where: { id: stockTransactionId },
    });

  if (existing.user_id !== member.id) {
    throw new Error("Unauthorized: not the owner of this stock transaction");
  }

  const updated = await MyGlobal.prisma.chatbot_stock_transactions.update({
    where: { id: stockTransactionId },
    data: {
      user_id: body.user_id ?? undefined,
      stock_item_id: body.stock_item_id ?? undefined,
      transaction_type: body.transaction_type ?? undefined,
      quantity: body.quantity ?? undefined,
      price_per_unit: body.price_per_unit ?? undefined,
      transaction_fee: body.transaction_fee ?? undefined,
      total_price: body.total_price ?? undefined,
    },
  });

  return {
    id: updated.id,
    user_id: updated.user_id,
    stock_item_id: updated.stock_item_id,
    transaction_type: updated.transaction_type,
    quantity: updated.quantity,
    price_per_unit: updated.price_per_unit,
    transaction_fee: updated.transaction_fee,
    total_price: updated.total_price,
    created_at: toISOStringSafe(updated.created_at),
  };
}
