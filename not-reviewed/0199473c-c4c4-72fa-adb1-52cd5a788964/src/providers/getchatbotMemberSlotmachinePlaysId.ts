import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotSlotmachinePlay } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotSlotmachinePlay";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Get slot machine play details by ID
 *
 * This operation retrieves detailed information about a specific slot machine
 * play identified by its unique ID. It returns all data about the play
 * including the player, bet amount, individual slot outcomes, payout, and
 * timestamp.
 *
 * Access is restricted to authenticated members only.
 *
 * @param props - Object containing member payload and play ID
 * @param props.member - Authenticated member payload
 * @param props.id - UUID of the slot machine play to retrieve
 * @returns Detailed slot machine play information
 * @throws {Error} When play with specified ID does not exist
 */
export async function getchatbotMemberSlotmachinePlaysId(props: {
  member: MemberPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IChatbotSlotmachinePlay> {
  const { member, id } = props;

  const record =
    await MyGlobal.prisma.chatbot_slotmachine_plays.findUniqueOrThrow({
      where: { id },
    });

  return {
    id: record.id,
    chatbot_member_id: record.chatbot_member_id,
    bet_points: record.bet_points,
    slot1: record.slot1,
    slot2: record.slot2,
    slot3: record.slot3,
    payout_points: record.payout_points,
    created_at: toISOStringSafe(record.created_at),
  };
}
