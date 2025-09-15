import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotChatbotPointCooldown } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotChatbotPointCooldown";
import { IPageIChatbotChatbotPointCooldown } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIChatbotChatbotPointCooldown";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Retrieves a paginated list of chatbot point cooldown entries enforcing the
 * point awarding cooldowns per member.
 *
 * Allows filtering by member ID and last point award time ranges with
 * pagination support.
 *
 * @param props - Object containing authenticated member and filter/pagination
 *   criteria.
 * @param props.member - Authenticated member issuing the request.
 * @param props.body - Request body with optional filters and pagination.
 * @returns A paginated list of cooldown records matching the criteria.
 * @throws {Error} When database query fails unexpectedly.
 */
export async function patchchatbotMemberChatbotPointCooldowns(props: {
  member: MemberPayload;
  body: IChatbotChatbotPointCooldown.IRequest;
}): Promise<IPageIChatbotChatbotPointCooldown> {
  const { member, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Build combined last_point_time filter correctly
  const lastPointTimeFilter: {
    gte?: string & tags.Format<"date-time">;
    lte?: string & tags.Format<"date-time">;
  } = {};

  if (
    body.last_point_time_from !== undefined &&
    body.last_point_time_from !== null
  ) {
    lastPointTimeFilter.gte = body.last_point_time_from;
  }

  if (
    body.last_point_time_to !== undefined &&
    body.last_point_time_to !== null
  ) {
    lastPointTimeFilter.lte = body.last_point_time_to;
  }

  const where = {
    ...(body.chatbot_member_id !== undefined &&
      body.chatbot_member_id !== null && {
        chatbot_member_id: body.chatbot_member_id,
      }),
    ...(Object.keys(lastPointTimeFilter).length > 0 && {
      last_point_time: lastPointTimeFilter,
    }),
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.chatbot_point_cooldowns.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.chatbot_point_cooldowns.count({
      where,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id,
      chatbot_member_id: item.chatbot_member_id,
      last_point_time: item.last_point_time
        ? toISOStringSafe(item.last_point_time)
        : null,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
  };
}
