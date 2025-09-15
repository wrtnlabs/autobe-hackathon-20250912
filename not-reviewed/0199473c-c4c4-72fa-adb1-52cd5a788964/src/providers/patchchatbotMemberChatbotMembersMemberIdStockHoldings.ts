import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotChatbotMembersStockHoldings } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotChatbotMembersStockHoldings";
import { IPageIChatbotStockHoldings } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIChatbotStockHoldings";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Get list of stock holdings owned by a member
 *
 * This operation retrieves a paginated and optionally filtered list of stock
 * holdings from the chatbot_stock_holdings table, joined with related stock
 * item details. Only the authenticated member matching the memberId path
 * parameter is authorized.
 *
 * @param props - Object containing member payload, memberId parameter, and
 *   request body
 * @param props.member - Authenticated member payload
 * @param props.memberId - UUID path parameter identifying the target member
 * @param props.body - Request parameters for pagination and filtering
 * @returns A paginated summary of stock holdings owned by the member
 * @throws {Error} When the authenticated memberId and path memberId mismatch
 */
export async function patchchatbotMemberChatbotMembersMemberIdStockHoldings(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
  body: IChatbotChatbotMembersStockHoldings.IRequest;
}): Promise<IPageIChatbotStockHoldings.ISummary> {
  const { member, memberId, body } = props;

  if (member.id !== memberId) {
    throw new Error(
      "Unauthorized: You can only access your own stock holdings.",
    );
  }

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const where: {
    user_id: string & tags.Format<"uuid">;
    stock_item_id?: string & tags.Format<"uuid">;
    quantity?: { gte?: number; lte?: number };
  } = {
    user_id: memberId,
  };

  if (body.stock_item_id !== undefined && body.stock_item_id !== null) {
    where.stock_item_id = body.stock_item_id;
  }

  if (body.min_quantity !== undefined && body.min_quantity !== null) {
    where.quantity = { ...(where.quantity ?? {}), gte: body.min_quantity };
  }

  if (body.max_quantity !== undefined && body.max_quantity !== null) {
    where.quantity = { ...(where.quantity ?? {}), lte: body.max_quantity };
  }

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.chatbot_stock_holdings.findMany({
      where,
      orderBy: { created_at: "asc" },
      skip,
      take: limit,
      include: {
        stockItem: {
          select: {
            id: true,
            code: true,
            name: true,
            initial_price: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    }),
    MyGlobal.prisma.chatbot_stock_holdings.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      stock_item_id: row.stock_item_id,
      quantity: row.quantity,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
      stockItem: row.stockItem
        ? {
            id: row.stockItem.id,
            code: row.stockItem.code,
            name: row.stockItem.name,
            initial_price: row.stockItem.initial_price,
            created_at: toISOStringSafe(row.stockItem.created_at),
            updated_at: toISOStringSafe(row.stockItem.updated_at),
            deleted_at: row.stockItem.deleted_at
              ? toISOStringSafe(row.stockItem.deleted_at)
              : null,
          }
        : undefined,
    })),
  };
}
