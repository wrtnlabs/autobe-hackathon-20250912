import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotStockTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotStockTransaction";
import { IPageIChatbotStockTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIChatbotStockTransaction";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Retrieves a paginated list of chatbot stock transactions for the authorized
 * member.
 *
 * This operation fetches transaction history supporting filtering and
 * pagination. Only the authenticated member can query their own transactions.
 *
 * @param props - Request properties containing the authenticated member,
 *   memberId path parameter, and search/filter body
 * @returns Paginated list of matching chatbot stock transactions
 * @throws {Error} When the authenticated member tries to query transactions
 *   other than their own
 */
export async function patchchatbotMemberChatbotMembersMemberIdStockTransactions(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
  body: IChatbotStockTransaction.IRequest;
}): Promise<IPageIChatbotStockTransaction> {
  const { member, memberId, body } = props;

  // Authorization check: member can only query own records
  if (member.id !== memberId) {
    throw new Error(
      "Unauthorized: You can only query your own stock transactions",
    );
  }

  // Pagination defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Parse sort criteria
  let orderBy: { [key: string]: "asc" | "desc" } = { created_at: "desc" };
  if (body.sort) {
    const parts = body.sort.trim().split(/\s+/);
    if (parts.length === 2) {
      const [field, order] = parts;
      if (order === "asc" || order === "desc") {
        orderBy = { [field]: order };
      }
    }
  }

  // Construct where conditions with exact filters
  const where: {
    user_id: string & tags.Format<"uuid">;
    transaction_type?: "buy" | "sell";
    quantity?: {
      gte?: number & tags.Type<"int32">;
      lte?: number & tags.Type<"int32">;
    };
    price_per_unit?: {
      gte?: number & tags.Type<"int32">;
      lte?: number & tags.Type<"int32">;
    };
  } = {
    user_id: memberId,
  };

  if (body.transaction_type !== undefined && body.transaction_type !== null) {
    where.transaction_type = body.transaction_type;
  }

  if (body.min_quantity !== undefined && body.min_quantity !== null) {
    where.quantity = { ...where.quantity, gte: body.min_quantity };
  }

  if (body.max_quantity !== undefined && body.max_quantity !== null) {
    where.quantity = { ...where.quantity, lte: body.max_quantity };
  }

  if (
    body.min_price_per_unit !== undefined &&
    body.min_price_per_unit !== null
  ) {
    where.price_per_unit = {
      ...where.price_per_unit,
      gte: body.min_price_per_unit,
    };
  }

  if (
    body.max_price_per_unit !== undefined &&
    body.max_price_per_unit !== null
  ) {
    where.price_per_unit = {
      ...where.price_per_unit,
      lte: body.max_price_per_unit,
    };
  }

  // Fetch data and count
  const [data, total] = await Promise.all([
    MyGlobal.prisma.chatbot_stock_transactions.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.chatbot_stock_transactions.count({ where }),
  ]);

  // Convert date fields to iso string format
  const convertedData = data.map((tx) => ({
    id: tx.id,
    user_id: tx.user_id,
    stock_item_id: tx.stock_item_id,
    transaction_type: tx.transaction_type as "buy" | "sell",
    quantity: tx.quantity,
    price_per_unit: tx.price_per_unit,
    transaction_fee: tx.transaction_fee,
    total_price: tx.total_price,
    created_at: toISOStringSafe(tx.created_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: convertedData,
  };
}
