import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Delete a slot machine play record by unique ID.
 *
 * This DELETE operation permanently removes a slot machine play record
 * identified by its UUID from the chatbot_slotmachine_plays table in the
 * database.
 *
 * Only the owner member who created the play can delete it.
 *
 * @param props - The props object containing the authenticated member and the
 *   ID of the play to delete.
 * @param props.member - The authenticated member requesting the deletion.
 * @param props.id - The unique identifier (UUID) of the slot machine play to
 *   delete.
 * @throws {Error} Throws if the record does not exist or if the requesting
 *   member is not the owner.
 */
export async function deletechatbotMemberSlotmachinePlaysId(props: {
  member: MemberPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, id } = props;

  // Fetch the slot machine play record or throw if it doesn't exist
  const play =
    await MyGlobal.prisma.chatbot_slotmachine_plays.findUniqueOrThrow({
      where: { id },
    });

  // Authorization check: only the owner can delete their play
  if (play.chatbot_member_id !== member.id) {
    throw new Error("Unauthorized: You can only delete your own plays");
  }

  // Perform a hard delete since no soft delete field exists
  await MyGlobal.prisma.chatbot_slotmachine_plays.delete({
    where: { id },
  });
}
