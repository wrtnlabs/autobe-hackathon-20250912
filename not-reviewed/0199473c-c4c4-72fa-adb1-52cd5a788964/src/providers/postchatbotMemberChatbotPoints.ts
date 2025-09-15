import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotPoints } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotPoints";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Creates a new chatbot points record.
 *
 * This operation initializes points for a member in the chatbot system. It
 * requires a member identifier and initial points.
 *
 * @param props - Object containing member payload and creation data
 * @param props.member - Authenticated member payload
 * @param props.body - Data to create chatbot points
 * @returns The newly created chatbot points record with all fields
 * @throws {Error} Throws if database operation fails
 */
export async function postchatbotMemberChatbotPoints(props: {
  member: MemberPayload;
  body: IChatbotPoints.ICreate;
}): Promise<IChatbotPoints> {
  const { member, body } = props;

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.chatbot_points.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      chatbot_member_id: body.chatbot_member_id as string & tags.Format<"uuid">,
      points: body.points,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    chatbot_member_id: created.chatbot_member_id as string &
      tags.Format<"uuid">,
    points: created.points,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
