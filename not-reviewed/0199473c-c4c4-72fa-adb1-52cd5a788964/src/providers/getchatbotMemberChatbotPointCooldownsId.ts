import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotChatbotPointCooldown } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotChatbotPointCooldown";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Retrieve detailed information about a single chatbot point cooldown by its
 * UUID.
 *
 * This operation returns cooldown metadata linked to a user member, including
 * the last point award timestamp (if any), and creation/update timestamps in
 * ISO string format.
 *
 * Authorization is enforced externally via the authenticated member payload.
 *
 * @param props - Object containing authenticated member and cooldown ID
 * @param props.member - Authenticated member making the request
 * @param props.id - UUID of the chatbot point cooldown record to retrieve
 * @returns Detailed cooldown record conforming to IChatbotChatbotPointCooldown
 * @throws {Error} Throws if the specified cooldown ID does not exist
 */
export async function getchatbotMemberChatbotPointCooldownsId(props: {
  member: MemberPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IChatbotChatbotPointCooldown> {
  const { member, id } = props;

  const cooldown =
    await MyGlobal.prisma.chatbot_point_cooldowns.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        chatbot_member_id: true,
        last_point_time: true,
        created_at: true,
        updated_at: true,
      },
    });

  return {
    id: cooldown.id,
    chatbot_member_id: cooldown.chatbot_member_id,
    last_point_time: cooldown.last_point_time ?? undefined,
    created_at: toISOStringSafe(cooldown.created_at),
    updated_at: toISOStringSafe(cooldown.updated_at),
  };
}
