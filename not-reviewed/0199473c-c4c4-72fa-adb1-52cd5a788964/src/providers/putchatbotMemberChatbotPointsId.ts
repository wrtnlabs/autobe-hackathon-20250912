import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotPoints } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotPoints";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Update chatbot points information by ID.
 *
 * This operation allows authorized member users to update fields such as the
 * points total for a given chatbot_points record identified by its UUID.
 *
 * The member user must own the points record to update it; otherwise, an error
 * is thrown.
 *
 * @param props - Object containing the member payload, the chatbot points
 *   record ID, and the update body
 * @param props.member - Authenticated member performing the update
 * @param props.id - UUID of the chatbot_points record to update
 * @param props.body - Partial update object containing the points value
 * @returns The updated chatbot points record with all fields and timestamps
 * @throws {Error} If the chatbot points record is not owned by the member
 * @throws {Error} If the chatbot points record does not exist
 */
export async function putchatbotMemberChatbotPointsId(props: {
  member: MemberPayload;
  id: string & tags.Format<"uuid">;
  body: IChatbotPoints.IUpdate;
}): Promise<IChatbotPoints> {
  const { member, id, body } = props;

  // Fetch the existing chatbot points record or throw if not found
  const existing = await MyGlobal.prisma.chatbot_points.findUniqueOrThrow({
    where: { id },
  });

  // Authorization: only the owner member can update their points
  if (existing.chatbot_member_id !== member.id) {
    throw new Error("Unauthorized: You can only update your own points record");
  }

  // Update the chatbot points record only if points is provided
  const updated = await MyGlobal.prisma.chatbot_points.update({
    where: { id },
    data: {
      points: body.points ?? undefined,
    },
  });

  // Return the updated record with ISO string formatted date fields
  return {
    id: updated.id,
    chatbot_member_id: updated.chatbot_member_id,
    points: updated.points,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
