import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Update existing chatbot member by ID.
 *
 * Modifies mutable fields like nickname and deleted_at timestamp. Does not
 * allow changing internal_sender_id. Requires a valid member ID and
 * authenticated member context.
 *
 * @param props - Contains authenticated member, target member ID, and update
 *   data
 * @param props.member - Authenticated member context
 * @param props.id - UUID of the chatbot member to update
 * @param props.body - Update payload with optional nickname and deleted_at
 * @returns Updated chatbot member record with all standard fields
 * @throws Error if member with given ID does not exist
 */
export async function putchatbotMemberChatbotMembersId(props: {
  member: MemberPayload;
  id: string & tags.Format<"uuid">;
  body: IChatbotMember.IUpdate;
}): Promise<IChatbotMember> {
  const { member, id, body } = props;

  // Verify the member exists
  await MyGlobal.prisma.chatbot_members.findUniqueOrThrow({
    where: { id },
  });

  // Prepare data to update (only allowed fields)
  const updateData: IChatbotMember.IUpdate = {
    nickname: body.nickname ?? undefined,
    deleted_at: body.deleted_at ?? undefined,
  };

  // Update member record
  const updated = await MyGlobal.prisma.chatbot_members.update({
    where: { id },
    data: updateData,
  });

  // Return updated record with converted date fields
  return {
    id: updated.id,
    internal_sender_id: updated.internal_sender_id,
    nickname: updated.nickname,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
