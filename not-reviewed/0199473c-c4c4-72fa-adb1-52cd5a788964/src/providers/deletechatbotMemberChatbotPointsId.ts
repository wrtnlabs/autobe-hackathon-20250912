import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Delete chatbot points record by ID permanently.
 *
 * This operation performs a hard delete of the chatbot_points record identified
 * by the UUID path parameter. It removes all data associated and is
 * irreversible. Access is restricted to authorized member users who must own
 * the points record.
 *
 * @param props - Request properties
 * @param props.member - The authenticated member user who makes the request
 * @param props.id - Unique identifier of the chatbot points record to delete
 * @throws {Error} Throws an error if the points record does not exist or if the
 *   user is unauthorized to delete it
 */
export async function deletechatbotMemberChatbotPointsId(props: {
  member: MemberPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, id } = props;

  // Fetch the point record by id
  const pointRecord = await MyGlobal.prisma.chatbot_points.findUniqueOrThrow({
    where: { id },
  });

  // Verify ownership
  if (pointRecord.chatbot_member_id !== member.id) {
    throw new Error(
      "Unauthorized: You can only delete your own points record.",
    );
  }

  // Perform hard delete
  await MyGlobal.prisma.chatbot_points.delete({ where: { id } });
}
