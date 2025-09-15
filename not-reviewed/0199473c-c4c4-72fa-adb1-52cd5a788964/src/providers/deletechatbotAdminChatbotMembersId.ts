import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Permanently delete a chatbot member and all associated data by member ID.
 *
 * This function performs a hard delete of the chatbot member identified by the
 * UUID path parameter. All related data such as points, titles, audit logs, and
 * command logs are also deleted automatically due to cascading defined in the
 * database schema.
 *
 * Authorization is required and must be an admin user.
 *
 * @param props - Object containing the admin payload and the chatbot member's
 *   UUID
 * @param props.admin - Authenticated admin user payload performing the deletion
 * @param props.id - UUID of the chatbot member to be deleted
 * @returns Void
 * @throws {Error} Throws if the chatbot member does not exist
 */
export async function deletechatbotAdminChatbotMembersId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, id } = props;

  // Verify existence of the chatbot member
  await MyGlobal.prisma.chatbot_members.findUniqueOrThrow({
    where: { id },
  });

  // Perform hard delete operation
  await MyGlobal.prisma.chatbot_members.delete({
    where: { id },
  });
}
