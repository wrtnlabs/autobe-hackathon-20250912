import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new chatbot admin user.
 *
 * This function creates a new record in chatbot_admins table with a unique
 * internal_sender_id and nickname. The id is generated internally, and
 * timestamps are set automatically. Soft delete field is not set.
 *
 * Requires an admin user context for authorization.
 *
 * @param props - Object containing the authenticated admin and request body
 * @param props.admin - The authenticated admin performing the operation
 * @param props.body - Data required to create a chatbot admin user
 * @returns The full created chatbot admin user record
 * @throws {Error} If creation fails, such as due to uniqueness violation
 */
export async function postchatbotAdminChatbotAdmins(props: {
  admin: AdminPayload;
  body: IChatbotAdmin.ICreate;
}): Promise<IChatbotAdmin> {
  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.chatbot_admins.create({
    data: {
      id,
      internal_sender_id: props.body.internal_sender_id,
      nickname: props.body.nickname,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    internal_sender_id: created.internal_sender_id,
    nickname: created.nickname,
    created_at: now,
    updated_at: now,
    deleted_at: created.deleted_at ?? undefined,
  };
}
