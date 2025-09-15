import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotStockTransactions } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotStockTransactions";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Get a specific stock transaction of a chatbot member.
 *
 * This operation retrieves detailed information about a particular stock
 * transaction identified by stockTransactionId and belonging to the member
 * specified by memberId. It enforces ownership by validating that the
 * transaction belongs to the authenticated member.
 *
 * @param props - Object containing member authentication and identifiers
 * @param props.member - Authenticated member payload
 * @param props.memberId - UUID of the chatbot member
 * @param props.stockTransactionId - UUID of the stock transaction
 * @returns Detailed information of the stock transaction
 * @throws {Error} When the transaction is not found or user is unauthorized
 */
export async function getchatbotMemberChatbotMembersMemberIdStockTransactionsStockTransactionId(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
  stockTransactionId: string & tags.Format<"uuid">;
}): Promise<IChatbotStockTransactions> {
  const { member, memberId, stockTransactionId } = props;

  const transaction =
    await MyGlobal.prisma.chatbot_stock_transactions.findFirst({
      where: {
        id: stockTransactionId,
        user_id: memberId,
      },
    });

  if (transaction === null) {
    throw new Error("Transaction not found or unauthorized");
  }

  return {
    id: transaction.id,
    user_id: transaction.user_id,
    stock_item_id: transaction.stock_item_id,
    transaction_type: transaction.transaction_type as "buy" | "sell",
    quantity: transaction.quantity,
    price_per_unit: transaction.price_per_unit,
    transaction_fee: transaction.transaction_fee,
    total_price: transaction.total_price,
    created_at: toISOStringSafe(transaction.created_at),
  };
}
