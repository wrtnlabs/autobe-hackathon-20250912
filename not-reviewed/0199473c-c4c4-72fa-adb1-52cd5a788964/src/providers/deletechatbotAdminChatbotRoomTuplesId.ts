import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Delete a chatbot room tuple by UUID, permanently removing it from the system.
 *
 * This operation allows system administrators to delete obsolete or invalid
 * room mappings, which are used for isolating chat sessions and linking normal
 * chat rooms to their corresponding admin rooms.
 *
 * The system ensures referential integrity by cascading deletes to related
 * audit logs and other dependent data.
 *
 * Access to this operation is restricted to authorized admin personnel.
 *
 * @param props - Object containing admin authorization payload and the UUID of
 *   the room tuple to delete
 * @param props.admin - The authenticated admin executing this operation
 * @param props.id - UUID of the chatbot room tuple to be deleted
 * @returns Void
 * @throws {Error} If the specified chatbot room tuple ID does not exist
 */
export async function deletechatbotAdminChatbotRoomTuplesId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, id } = props;

  await MyGlobal.prisma.chatbot_room_tuples.findUniqueOrThrow({
    where: { id },
  });

  await MyGlobal.prisma.chatbot_room_tuples.delete({
    where: { id },
  });
}
