import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Delete a stock transaction of a chatbot member.
 *
 * This operation permanently deletes the specified stock transaction identified
 * by stockTransactionId. It enforces authorization by verifying the requesting
 * member is the owner of the transaction. If the transaction does not exist or
 * the member is unauthorized, it throws an error.
 *
 * @param props - The input props containing authentication info and
 *   identifiers.
 * @param props.member - Authenticated member payload performing the deletion.
 * @param props.memberId - The unique identifier of the chatbot member.
 * @param props.stockTransactionId - The unique identifier of the stock
 *   transaction to delete.
 * @returns Void
 * @throws {Error} Throws if the stock transaction is not found.
 * @throws {Error} Throws if the authenticated member is not the owner of the
 *   transaction.
 */
export async function deletechatbotMemberChatbotMembersMemberIdStockTransactionsStockTransactionId(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
  stockTransactionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const stockTransaction =
    await MyGlobal.prisma.chatbot_stock_transactions.findUnique({
      where: { id: props.stockTransactionId },
    });

  if (!stockTransaction) throw new Error("Stock transaction not found");

  if (stockTransaction.user_id !== props.member.id) {
    throw new Error("Unauthorized: Cannot delete others' transactions");
  }

  await MyGlobal.prisma.chatbot_stock_transactions.delete({
    where: { id: props.stockTransactionId },
  });
}
