import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotStockHoldings } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotStockHoldings";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Get detailed stock holding info by IDs
 *
 * Retrieve detailed information about a specific stock holding belonging to a
 * chatbot member. Ensures the authenticated member is authorized to access this
 * stock holding by matching the memberId. Throws if the stock holding does not
 * exist or does not belong to the member.
 *
 * @param props - Object containing member payload, memberId, and stockHoldingId
 * @param props.member - Authenticated member payload
 * @param props.memberId - UUID of the member owning the stock holding
 * @param props.stockHoldingId - UUID of the stock holding record
 * @returns Detailed stock holding information conforming to
 *   IChatbotStockHoldings
 * @throws {Error} Throws if stock holding not found or unauthorized access
 */
export async function getchatbotMemberChatbotMembersMemberIdStockHoldingsStockHoldingId(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
  stockHoldingId: string & tags.Format<"uuid">;
}): Promise<IChatbotStockHoldings> {
  const { member, memberId, stockHoldingId } = props;

  // Authorization check enforced by matching user_id to memberId in query
  const holding =
    await MyGlobal.prisma.chatbot_stock_holdings.findUniqueOrThrow({
      where: {
        id: stockHoldingId,
        user_id: memberId,
      },
    });

  return {
    id: holding.id,
    user_id: holding.user_id,
    stock_item_id: holding.stock_item_id,
    quantity: holding.quantity,
    created_at: toISOStringSafe(holding.created_at),
    updated_at: toISOStringSafe(holding.updated_at),
    deleted_at: holding.deleted_at ? toISOStringSafe(holding.deleted_at) : null,
  };
}
