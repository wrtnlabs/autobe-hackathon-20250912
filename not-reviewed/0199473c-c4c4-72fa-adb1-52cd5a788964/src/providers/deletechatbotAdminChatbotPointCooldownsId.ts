import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Permanently deletes a chatbot point cooldown record from the database.
 *
 * This hard delete operation removes the cooldown record identified by its
 * UUID. Only admin users with proper authorization can perform this operation.
 *
 * @param props - Object containing the admin user info and the ID of the
 *   cooldown to delete
 * @param props.admin - Authenticated admin user payload
 * @param props.id - UUID of the chatbot point cooldown to be deleted
 * @returns A Promise that resolves when the deletion is complete
 * @throws {Error} Throws if the cooldown record does not exist
 */
export async function deletechatbotAdminChatbotPointCooldownsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, id } = props;

  // Verify the cooldown exists
  await MyGlobal.prisma.chatbot_point_cooldowns.findUniqueOrThrow({
    where: { id },
  });

  // Delete the cooldown record
  await MyGlobal.prisma.chatbot_point_cooldowns.delete({ where: { id } });
}
