import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing chatbot admin user by ID
 *
 * This operation updates an existing admin user record within the chatbot
 * system based on the provided unique admin ID. The admin entity represents a
 * user with elevated privileges who operates in dedicated admin rooms,
 * identified by internal sender ID and nickname, and maintains timestamps for
 * creation, update, and optional deletion. The update process allows modifying
 * mutable fields including nickname and internal sender ID while preserving
 * system integrity through primary key identification.
 *
 * Authorization roles restrict this operation to users with 'admin' role,
 * maintaining system security.
 *
 * @param props - Object containing the admin payload, admin ID, and update body
 * @param props.admin - The authenticated admin performing the update
 * @param props.id - UUID of the chatbot admin to update
 * @param props.body - Data conforming to IChatbotAdmin.IUpdate for update
 * @returns The updated chatbot admin user data
 * @throws {Error} Throws if the admin with given ID does not exist
 * @throws {Error} Throws if update violates uniqueness constraints
 */
export async function putchatbotAdminChatbotAdminsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IChatbotAdmin.IUpdate;
}): Promise<IChatbotAdmin> {
  const { admin, id, body } = props;

  // Verify that the admin exists
  await MyGlobal.prisma.chatbot_admins.findUniqueOrThrow({ where: { id } });

  // Perform update with provided body fields and updated_at timestamp
  const updated = await MyGlobal.prisma.chatbot_admins.update({
    where: { id },
    data: {
      internal_sender_id: body.internal_sender_id ?? undefined,
      nickname: body.nickname ?? undefined,
      deleted_at: body.deleted_at ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return updated admin with date fields converted to string & tags.Format<'date-time'>
  return {
    id: updated.id,
    internal_sender_id: updated.internal_sender_id,
    nickname: updated.nickname,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
