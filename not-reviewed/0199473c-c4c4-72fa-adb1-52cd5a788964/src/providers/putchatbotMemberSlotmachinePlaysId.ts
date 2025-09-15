import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotSlotmachinePlay } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotSlotmachinePlay";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Update the details of a slot machine play identified by its unique ID.
 *
 * This includes changing bet points, slot results, payout, or other modifiable
 * fields.
 *
 * The play ID is required as a path parameter and must be a valid UUID.
 *
 * The request body must conform to the defined update schema.
 *
 * Only authorized members can perform this update.
 *
 * @param props - Object containing member info, the play ID, and update body.
 * @returns Updated slot machine play information as per
 *   IChatbotSlotmachinePlay.
 * @throws {Error} When the record is not found or user is unauthorized.
 * @throws {Error} When trying to update non-updatable fields like
 *   chatbot_member_id or created_at.
 */
export async function putchatbotMemberSlotmachinePlaysId(props: {
  member: MemberPayload;
  id: string & tags.Format<"uuid">;
  body: IChatbotSlotmachinePlay.IUpdate;
}): Promise<IChatbotSlotmachinePlay> {
  const { member, id, body } = props;

  // Fetch existing record
  const existing = await MyGlobal.prisma.chatbot_slotmachine_plays.findUnique({
    where: { id },
  });
  if (!existing) throw new Error("Slot machine play record not found");

  // Authorization check
  if (existing.chatbot_member_id !== member.id) {
    throw new Error("Unauthorized access to slot machine play record");
  }

  // Disallow update of non-updatable fields
  if (body.chatbot_member_id !== undefined) {
    throw new Error("Updating chatbot_member_id is not allowed");
  }
  if (body.created_at !== undefined) {
    throw new Error("Updating created_at is not allowed");
  }

  // Prepare update data, convert nullable numbers properly
  const data: {
    bet_points?: number | null;
    slot1?: number | null;
    slot2?: number | null;
    slot3?: number | null;
    payout_points?: number | null;
  } = {};

  if (body.bet_points !== undefined) data.bet_points = body.bet_points;
  if (body.slot1 !== undefined) data.slot1 = body.slot1;
  if (body.slot2 !== undefined) data.slot2 = body.slot2;
  if (body.slot3 !== undefined) data.slot3 = body.slot3;
  if (body.payout_points !== undefined) data.payout_points = body.payout_points;

  // Update the record
  await MyGlobal.prisma.chatbot_slotmachine_plays.update({
    where: { id },
    data,
  });

  // Retrieve updated record
  const updated =
    await MyGlobal.prisma.chatbot_slotmachine_plays.findUniqueOrThrow({
      where: { id },
    });

  return {
    id: updated.id,
    chatbot_member_id: updated.chatbot_member_id,
    bet_points: updated.bet_points,
    slot1: updated.slot1,
    slot2: updated.slot2,
    slot3: updated.slot3,
    payout_points: updated.payout_points,
    created_at: toISOStringSafe(updated.created_at),
  };
}
