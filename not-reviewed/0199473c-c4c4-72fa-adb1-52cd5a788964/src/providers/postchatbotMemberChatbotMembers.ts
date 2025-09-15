import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Create a new chatbot member record.
 *
 * This function creates a new member in the chatbot_members table, assigning a
 * unique UUID, the provided internal sender id, and nickname. It sets creation
 * and update timestamps to the current time in ISO string format.
 *
 * @param props - Contains authenticated member payload and creation data
 * @param props.member - The authenticated member performing the operation
 * @param props.body - The member creation data, including internal_sender_id
 *   and nickname
 * @returns Promise resolving to the complete chatbot member record
 * @throws Error if the creation fails or constraints are violated
 */
export async function postchatbotMemberChatbotMembers(props: {
  member: MemberPayload;
  body: IChatbotMember.ICreate;
}): Promise<IChatbotMember> {
  const { body } = props;

  const now = toISOStringSafe(new Date());

  // Generate a UUID and brand it properly
  const id = v4() as unknown as string as string & typeof tags.Format<"uuid">;

  // Prepare data for creation
  const data = {
    id: id,
    internal_sender_id: body.internal_sender_id,
    nickname: body.nickname,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  // Create the member record
  const created = await MyGlobal.prisma.chatbot_members.create({ data });

  // Return the created object with consistent date handling
  return {
    id: created.id,
    internal_sender_id: created.internal_sender_id,
    nickname: created.nickname,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
}
