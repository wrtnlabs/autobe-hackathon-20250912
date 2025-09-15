import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotPoints } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotPoints";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Retrieves detailed chatbot points information by unique ID.
 *
 * This operation fetches a single chatbot_points record for the authenticated
 * member. It ensures the member is authorized to access the specified points
 * record.
 *
 * @param props - The parameters including authenticated member and point record
 *   ID.
 * @param props.member - The authenticated chatbot member.
 * @param props.id - The unique identifier of the chatbot points record.
 * @returns The chatbot points entity matching the ID owned by the member.
 * @throws {Error} When the points record does not exist.
 * @throws {Error} When the member is not authorized to access the points
 *   record.
 */
export async function getchatbotMemberChatbotPointsId(props: {
  member: MemberPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IChatbotPoints> {
  const { member, id } = props;

  const points = await MyGlobal.prisma.chatbot_points.findUnique({
    where: { id },
  });

  if (!points) {
    throw new Error(`Chatbot points with id ${id} not found.`);
  }

  if (points.chatbot_member_id !== member.id) {
    throw new Error("Unauthorized access to chatbot points.");
  }

  return {
    id: points.id,
    chatbot_member_id: points.chatbot_member_id,
    points: points.points,
    created_at: toISOStringSafe(points.created_at),
    updated_at: toISOStringSafe(points.updated_at),
  };
}
