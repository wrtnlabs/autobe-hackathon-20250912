import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Deletes a chatbot admin user permanently by their UUID.
 *
 * This operation HARD deletes the record from the chatbot_admins table. Soft
 * delete is not performed.
 *
 * Authorization: Only 'admin' role users may perform this operation.
 *
 * @param props - The input props object
 * @param props.admin - The authenticated admin user performing the deletion
 * @param props.id - The UUID of the chatbot admin user to delete
 * @throws {Error} If the chatbot admin user with the specified ID does not
 *   exist
 */
export async function deletechatbotAdminChatbotAdminsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, id } = props;

  // Ensure the chatbot admin exists
  await MyGlobal.prisma.chatbot_admins.findUniqueOrThrow({ where: { id } });

  // Hard delete the chatbot admin
  await MyGlobal.prisma.chatbot_admins.delete({ where: { id } });
}
