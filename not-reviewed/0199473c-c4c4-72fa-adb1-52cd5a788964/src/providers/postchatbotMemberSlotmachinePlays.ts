import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotSlotmachinePlay } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotSlotmachinePlay";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Record a new slot machine play.
 *
 * Creates a new slot machine play record in the chatbot system, recording the
 * user, bet points, slot results, payout points, and timestamp.
 *
 * Only authenticated members can perform this operation.
 *
 * @param props - Properties including authenticated member and the play data
 * @param props.member - Authenticated member payload containing user ID
 * @param props.body - Slot machine play creation data
 * @returns The newly created slot machine play record
 * @throws {Error} Propagates errors from Prisma or invalid input
 */
export async function postchatbotMemberSlotmachinePlays(props: {
  member: MemberPayload;
  body: IChatbotSlotmachinePlay.ICreate;
}): Promise<IChatbotSlotmachinePlay> {
  const { member, body } = props;

  const created = await MyGlobal.prisma.chatbot_slotmachine_plays.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      chatbot_member_id: member.id,
      bet_points: body.bet_points,
      slot1: body.slot1,
      slot2: body.slot2,
      slot3: body.slot3,
      payout_points: body.payout_points,
      created_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: created.id,
    chatbot_member_id: created.chatbot_member_id,
    bet_points: created.bet_points,
    slot1: created.slot1,
    slot2: created.slot2,
    slot3: created.slot3,
    payout_points: created.payout_points,
    created_at: toISOStringSafe(created.created_at),
  };
}
