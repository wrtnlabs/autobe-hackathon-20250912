import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotMember";
import { IPageIChatbotMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIChatbotMember";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and retrieve a paginated list of chatbot members.
 *
 * This endpoint allows an authorized admin user to filter chatbot members by
 * optional nickname and internal sender ID, supporting pagination and sorting.
 * It excludes soft-deleted users.
 *
 * @param props - Object containing admin authentication and request filters
 * @param props.admin - The authenticated admin payload
 * @param props.body - Search and pagination criteria for chatbot members
 * @returns Paginated summary list of matching chatbot members
 * @throws {Error} When database operations fail
 */
export async function patchchatbotAdminChatbotMembers(props: {
  admin: AdminPayload;
  body: IChatbotMember.IRequest;
}): Promise<IPageIChatbotMember.ISummary> {
  const { body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
    ...(body.internal_sender_id !== undefined &&
      body.internal_sender_id !== null && {
        internal_sender_id: body.internal_sender_id,
      }),
    ...(body.nickname !== undefined &&
      body.nickname !== null && {
        nickname: {
          contains: body.nickname,
        },
      }),
  };

  const [members, total] = await Promise.all([
    MyGlobal.prisma.chatbot_members.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        internal_sender_id: true,
        nickname: true,
      },
    }),
    MyGlobal.prisma.chatbot_members.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: members.map((m) => ({
      id: m.id,
      internal_sender_id: m.internal_sender_id,
      nickname: m.nickname,
    })),
  };
}
