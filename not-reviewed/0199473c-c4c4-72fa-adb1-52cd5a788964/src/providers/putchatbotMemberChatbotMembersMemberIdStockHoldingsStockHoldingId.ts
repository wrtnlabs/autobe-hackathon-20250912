import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotStockHolding } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotStockHolding";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Update a chatbot member's stock holding
 *
 * This operation modifies the quantity or deletion status of a stock holding
 * linked to a specified member. It performs authorization by verifying that the
 * stock holding belongs to the given member.
 *
 * @param props - Object containing the member's authentication payload, member
 *   UUID, stock holding UUID, and update data
 * @param props.member - Authenticated member payload representing the user
 *   performing the update
 * @param props.memberId - UUID of the member who owns the stock holding
 * @param props.stockHoldingId - UUID of the stock holding to update
 * @param props.body - Update information conforming to
 *   IChatbotStockHolding.IUpdate
 * @returns The updated IChatbotStockHolding record
 * @throws {Error} If the stock holding does not exist or does not belong to the
 *   member
 */
export async function putchatbotMemberChatbotMembersMemberIdStockHoldingsStockHoldingId(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
  stockHoldingId: string & tags.Format<"uuid">;
  body: IChatbotStockHolding.IUpdate;
}): Promise<IChatbotStockHolding> {
  const { member, memberId, stockHoldingId, body } = props;

  // Authorization: confirm the stock holding belongs to the member
  const stockHolding = await MyGlobal.prisma.chatbot_stock_holdings.findFirst({
    where: {
      id: stockHoldingId,
      user_id: memberId,
      deleted_at: null,
    },
  });

  if (!stockHolding) {
    throw new Error("Stock holding not found or not owned by the member");
  }

  // Perform the update
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.chatbot_stock_holdings.update({
    where: { id: stockHoldingId },
    data: {
      quantity: body.quantity,
      deleted_at: body.deleted_at,
      updated_at: now,
    },
  });

  // Return the updated record with date fields as ISO strings
  return {
    id: updated.id as string & tags.Format<"uuid">,
    user_id: updated.user_id as string & tags.Format<"uuid">,
    stock_item_id: updated.stock_item_id as string & tags.Format<"uuid">,
    quantity: updated.quantity,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: now,
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
