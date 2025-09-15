import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotRoomTuples } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotRoomTuples";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Creates a new chatbot room tuple mapping normal room to admin room with
 * associated metadata for session isolation and routing.
 *
 * Requires admin authorization. The tuple includes identifiers for normal and
 * admin rooms, display name, unique business ID, enablement flag, and
 * timestamps.
 *
 * @param props - Object containing the authenticated admin user and the tuple
 *   creation data
 * @param props.admin - Authenticated admin payload
 * @param props.body - Chatbot room tuple creation information
 * @returns The newly created chatbot room tuple with full details
 * @throws {Error} When `unique_id` is duplicated
 */
export async function postchatbotAdminChatbotRoomTuples(props: {
  admin: AdminPayload;
  body: IChatbotRoomTuples.ICreate;
}): Promise<IChatbotRoomTuples> {
  const { admin, body } = props;

  // Check if unique_id already exists
  const existing = await MyGlobal.prisma.chatbot_room_tuples.findUnique({
    where: { unique_id: body.unique_id },
    select: { id: true },
  });

  if (existing !== null) {
    throw new Error(`Duplicate unique_id: ${body.unique_id}`);
  }

  const now = toISOStringSafe(new Date());

  // Default enabled to true if null or undefined
  const enabled =
    body.enabled === null || body.enabled === undefined ? true : body.enabled;

  // Create the chatbot room tuple record
  const created = await MyGlobal.prisma.chatbot_room_tuples.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      normal_room_id: body.normal_room_id,
      admin_room_id: body.admin_room_id,
      display_name: body.display_name,
      unique_id: body.unique_id,
      enabled,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Return the fully typed record
  return {
    id: created.id,
    normal_room_id: created.normal_room_id,
    admin_room_id: created.admin_room_id,
    display_name: created.display_name,
    unique_id: created.unique_id,
    enabled: created.enabled,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
}
