import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotStockHolding } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotStockHolding";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Create a stock holding record for a chatbot member.
 *
 * This operation allows adding stock holdings to a user's virtual stock
 * portfolio, associating the holding with the specified member ID.
 *
 * Authorization:
 *
 * - Only authenticated members can perform this operation.
 *
 * @param props - The function parameters including authenticated member, member
 *   ID path parameter, and stock holding creation body.
 * @param props.member - Authenticated member payload.
 * @param props.memberId - UUID of the target chatbot member.
 * @param props.body - Data to create new stock holding, including stock item ID
 *   and quantity.
 * @returns Returns the newly created stock holding record with ID and
 *   timestamps.
 * @throws {Error} Throws if the chatbot member identified by memberId does not
 *   exist or is soft-deleted.
 */
export async function postchatbotMemberChatbotMembersMemberIdStockHoldings(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
  body: IChatbotStockHolding.ICreate;
}): Promise<IChatbotStockHolding> {
  const { member, memberId, body } = props;

  const memberRecord = await MyGlobal.prisma.chatbot_members.findFirst({
    where: {
      id: memberId,
      deleted_at: null,
    },
  });

  if (!memberRecord) {
    throw new Error("Member not found or deleted");
  }

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.chatbot_stock_holdings.create({
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

  return {
    id: created.id,
    user_id: created.user_id,
    stock_item_id: created.stock_item_id,
    quantity: created.quantity,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
