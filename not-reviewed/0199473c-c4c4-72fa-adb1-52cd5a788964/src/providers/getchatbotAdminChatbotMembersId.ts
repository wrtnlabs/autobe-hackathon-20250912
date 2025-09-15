import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotMember";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve detailed information of a chatbot member by their unique UUID.
 *
 * This operation is intended for admin users and retrieves all member fields
 * including internal sender ID, nickname, and timestamps including soft
 * deletion timestamp.
 *
 * @param props - Object containing admin authentication and member UUID
 * @param props.admin - Authenticated admin user performing the operation
 * @param props.id - UUID of the chatbot member to retrieve
 * @returns Detailed chatbot member data as IChatbotMember
 * @throws {Error} Throws if no member is found with the specified UUID
 */
export async function getchatbotAdminChatbotMembersId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IChatbotMember> {
  const found = await MyGlobal.prisma.chatbot_members.findUniqueOrThrow({
    where: { id: props.id },
  });

  return {
    id: found.id,
    internal_sender_id: found.internal_sender_id,
    nickname: found.nickname,
    created_at: toISOStringSafe(found.created_at),
    updated_at: toISOStringSafe(found.updated_at),
    deleted_at: found.deleted_at ? toISOStringSafe(found.deleted_at) : null,
  };
}
