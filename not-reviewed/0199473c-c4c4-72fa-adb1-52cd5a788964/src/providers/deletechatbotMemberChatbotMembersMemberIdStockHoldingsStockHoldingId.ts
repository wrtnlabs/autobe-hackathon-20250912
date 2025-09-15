import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Deletes a chatbot member's stock holding record.
 *
 * This operation permanently removes the specified stock holding entry from the
 * user's portfolio.
 *
 * Authorization: Only the member who owns the holding can delete it.
 *
 * @param props.member - The authenticated member performing the delete.
 * @param props.memberId - The UUID of the chatbot member whose stock holding is
 *   targeted.
 * @param props.stockHoldingId - The UUID of the stock holding record to delete.
 * @throws {Error} If the stock holding does not exist.
 * @throws {Error} If the member is not authorized to delete this holding.
 */
export async function deletechatbotMemberChatbotMembersMemberIdStockHoldingsStockHoldingId(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
  stockHoldingId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, memberId, stockHoldingId } = props;

  const holding = await MyGlobal.prisma.chatbot_stock_holdings.findUnique({
    where: { id: stockHoldingId },
  });
  if (!holding) {
    throw new Error("Stock holding not found");
  }

  if (holding.user_id !== member.id) {
    throw new Error("Unauthorized: cannot delete others' stock holdings");
  }

  await MyGlobal.prisma.chatbot_stock_holdings.delete({
    where: { id: stockHoldingId },
  });
}
