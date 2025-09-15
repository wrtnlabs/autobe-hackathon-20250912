import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotRoomTuples } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotRoomTuples";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve chatbot room tuple details by ID.
 *
 * This operation retrieves detailed information about a specific chatbot room
 * tuple identified by its unique ID. The tuple links a normal chat room to an
 * admin room, providing mapping info such as display name, unique business
 * identifier, enablement status, and audit timestamps.
 *
 * This GET operation is intended for administrative use to view the full
 * details of a particular room tuple for configuration, verification, or
 * auditing purposes.
 *
 * Access is restricted to authorized users with 'admin' role to ensure security
 * of room mappings and prevent unauthorized exposure of system routing
 * details.
 *
 * @param props - Object containing the admin authentication payload and the
 *   unique ID of the room tuple to retrieve
 * @param props.admin - The authenticated admin user making the request
 * @param props.id - The UUID of the chatbot room tuple to be retrieved
 * @returns Detailed chatbot room tuple information, including mapping
 *   identifiers, display name, enablement flag, and audit timestamps
 * @throws {Error} Throws if the room tuple with the specified ID does not exist
 */
export async function getchatbotAdminChatbotRoomTuplesId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IChatbotRoomTuples> {
  const { admin, id } = props;

  // Authorization is assumed to be handled externally

  const tuple = await MyGlobal.prisma.chatbot_room_tuples.findUniqueOrThrow({
    where: { id },
    select: {
      id: true,
      normal_room_id: true,
      admin_room_id: true,
      display_name: true,
      unique_id: true,
      enabled: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  return {
    id: tuple.id,
    normal_room_id: tuple.normal_room_id,
    admin_room_id: tuple.admin_room_id,
    display_name: tuple.display_name,
    unique_id: tuple.unique_id,
    enabled: tuple.enabled,
    created_at: toISOStringSafe(tuple.created_at),
    updated_at: toISOStringSafe(tuple.updated_at),
    deleted_at: tuple.deleted_at ? toISOStringSafe(tuple.deleted_at) : null,
  };
}
