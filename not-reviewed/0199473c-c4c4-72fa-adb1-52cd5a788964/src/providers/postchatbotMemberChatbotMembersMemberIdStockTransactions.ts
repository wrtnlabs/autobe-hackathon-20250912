import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotStockTransactions } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotStockTransactions";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Creates a new stock transaction record for a chatbot member in the virtual
 * stock trading system.
 *
 * This operation enforces authorization by ensuring the authenticated member
 * matches the provided memberId. It verifies stock item existence, validates
 * the transaction type, quantity, and checks that sufficient points or holdings
 * are available. The transaction performs an atomic update of the stock
 * transaction, the member's holdings, and the member's points.
 *
 * @param props - Object containing authentication, path parameter, and body for
 *   the stock transaction creation.
 * @param props.member - Authenticated member payload.
 * @param props.memberId - Unique identifier of the member performing the
 *   transaction.
 * @param props.body - Stock transaction creation details (transaction type,
 *   stock item, quantity, pricing, fees).
 * @returns The created stock transaction record with all fields populated.
 * @throws {Error} When authorization fails or member ID mismatch.
 * @throws {Error} When member or stock item does not exist.
 * @throws {Error} When quantity is non-positive or transaction type is invalid.
 * @throws {Error} When insufficient points or holdings are detected.
 */
export async function postchatbotMemberChatbotMembersMemberIdStockTransactions(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
  body: IChatbotStockTransactions.ICreate;
}): Promise<IChatbotStockTransactions> {
  const { member, memberId, body } = props;

  if (member.id !== memberId)
    throw new Error("Unauthorized: Member ID does not match logged in user");

  const memberRecord = await MyGlobal.prisma.chatbot_members.findUnique({
    where: { id: memberId },
    select: { id: true },
  });
  if (!memberRecord) throw new Error("Member not found");

  const stockItem = await MyGlobal.prisma.chatbot_stock_items.findUnique({
    where: { id: body.stock_item_id },
    select: { id: true },
  });
  if (!stockItem) throw new Error("Stock item not found");

  if (body.quantity <= 0) throw new Error("Quantity must be positive");

  if (body.transaction_type !== "buy" && body.transaction_type !== "sell") {
    throw new Error("Invalid transaction type");
  }

  const memberPoints = await MyGlobal.prisma.chatbot_points.findUnique({
    where: { chatbot_member_id: memberId },
    select: { points: true },
  });

  const currentPoints = memberPoints?.points ?? 0;

  const stockHolding = await MyGlobal.prisma.chatbot_stock_holdings.findFirst({
    where: {
      user_id: memberId,
      stock_item_id: body.stock_item_id,
      deleted_at: null,
    },
    select: { id: true, quantity: true },
  });

  if (body.transaction_type === "buy" && currentPoints < body.total_price) {
    throw new Error("Insufficient points to complete the purchase");
  }

  if (
    body.transaction_type === "sell" &&
    (!stockHolding || stockHolding.quantity < body.quantity)
  ) {
    throw new Error("Insufficient stock holdings to complete the sale");
  }

  const now = toISOStringSafe(new Date());
  const transactionId = v4() as string & tags.Format<"uuid">;

  return await MyGlobal.prisma.$transaction(async (tx) => {
    const transaction = await tx.chatbot_stock_transactions.create({
      data: {
        id: transactionId,
        user_id: memberId,
        stock_item_id: body.stock_item_id,
        transaction_type: body.transaction_type,
        quantity: body.quantity,
        price_per_unit: body.price_per_unit,
        transaction_fee: body.transaction_fee,
        total_price: body.total_price,
        created_at: now,
      },
    });

    if (body.transaction_type === "buy") {
      if (stockHolding) {
        await tx.chatbot_stock_holdings.update({
          where: { id: stockHolding.id },
          data: {
            quantity: stockHolding.quantity + body.quantity,
            updated_at: now,
          },
        });
      } else {
        await tx.chatbot_stock_holdings.create({
          data: {
            id: v4() as string & tags.Format<"uuid">,
            user_id: memberId,
            stock_item_id: body.stock_item_id,
            quantity: body.quantity,
            created_at: now,
            updated_at: now,
            deleted_at: null,
          },
        });
      }
      await tx.chatbot_points.update({
        where: { chatbot_member_id: memberId },
        data: {
          points: currentPoints - body.total_price,
          updated_at: now,
        },
      });
    } else {
      // sell
      const newQuantity = stockHolding!.quantity - body.quantity;
      if (newQuantity < 0)
        throw new Error("Unexpected error: Negative stock quantity");
      if (newQuantity === 0) {
        await tx.chatbot_stock_holdings.update({
          where: { id: stockHolding!.id },
          data: {
            quantity: 0,
            deleted_at: now,
            updated_at: now,
          },
        });
      } else {
        await tx.chatbot_stock_holdings.update({
          where: { id: stockHolding!.id },
          data: {
            quantity: newQuantity,
            updated_at: now,
          },
        });
      }

      await tx.chatbot_points.update({
        where: { chatbot_member_id: memberId },
        data: {
          points: currentPoints + body.total_price,
          updated_at: now,
        },
      });
    }

    return {
      id: transaction.id,
      user_id: transaction.user_id,
      stock_item_id: transaction.stock_item_id,
      transaction_type: transaction.transaction_type,
      quantity: transaction.quantity,
      price_per_unit: transaction.price_per_unit,
      transaction_fee: transaction.transaction_fee,
      total_price: transaction.total_price,
      created_at: toISOStringSafe(transaction.created_at),
    };
  });
}
