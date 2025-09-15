import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotRoomTuples } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotRoomTuples";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update chatbot room tuple by ID.
 *
 * This operation updates fields such as normal_room_id, admin_room_id,
 * display_name, unique_id, and enabled flag. It updates the modification
 * timestamp and returns the updated tuple. Only accessible by admin users.
 *
 * @param props - Object containing admin auth, ID of the tuple, and update body
 * @param props.admin - Authenticated admin user performing the update
 * @param props.id - UUID of the chatbot room tuple to update
 * @param props.body - Update data for the chatbot room tuple
 * @returns Updated chatbot room tuple details
 * @throws {Error} Throws if the tuple with the given ID is not found
 */
export async function putchatbotAdminChatbotRoomTuplesId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IChatbotRoomTuples.IUpdate;
}): Promise<IChatbotRoomTuples> {
  const { admin, id, body } = props;

  // Authorization is assumed handled outside this function

  const tuple = await MyGlobal.prisma.chatbot_room_tuples.findUniqueOrThrow({
    where: { id },
  });

  const updated = await MyGlobal.prisma.chatbot_room_tuples.update({
    where: { id },
    data: {
      normal_room_id:
        body.normal_room_id === null
          ? null
          : (body.normal_room_id ?? undefined),
      admin_room_id:
        body.admin_room_id === null ? null : (body.admin_room_id ?? undefined),
      display_name:
        body.display_name === null ? null : (body.display_name ?? undefined),
      unique_id: body.unique_id === null ? null : (body.unique_id ?? undefined),
      enabled: body.enabled === null ? null : (body.enabled ?? undefined),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    normal_room_id: updated.normal_room_id,
    admin_room_id: updated.admin_room_id,
    display_name: updated.display_name,
    unique_id: updated.unique_id,
    enabled: updated.enabled,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
