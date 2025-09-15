import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve chatbot admin details by UUID.
 *
 * Fetches all details of a chatbot admin user identified by the given UUID.
 * Only accessible by users with admin role. Throws if no user found with the
 * specified UUID.
 *
 * @param props - Object containing admin payload and chatbot admin UUID
 * @param props.admin - The authenticated admin making the request
 * @param props.id - UUID of the chatbot admin to retrieve
 * @returns Detailed chatbot admin information
 * @throws {Error} Throws if chatbot admin not found (404)
 */
export async function getchatbotAdminChatbotAdminsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IChatbotAdmin> {
  const { admin, id } = props;

  const chatbotAdmin = await MyGlobal.prisma.chatbot_admins.findUniqueOrThrow({
    where: { id },
  });

  return {
    id: chatbotAdmin.id,
    internal_sender_id: chatbotAdmin.internal_sender_id,
    nickname: chatbotAdmin.nickname,
    created_at: toISOStringSafe(chatbotAdmin.created_at),
    updated_at: toISOStringSafe(chatbotAdmin.updated_at),
    deleted_at: chatbotAdmin.deleted_at ?? null,
  };
}
