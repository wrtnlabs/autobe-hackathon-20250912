import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotAdmin";
import { IPageIChatbotAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIChatbotAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve paginated filtered list of chatbot admins.
 *
 * This operation supports filtering by nickname substring, pagination (page and
 * limit), and returns a summary list of admins with id, internal_sender_id, and
 * nickname. Only includes admins not soft-deleted (deleted_at == null).
 *
 * @param props - Object containing admin payload and request body for filters
 *   and pagination.
 * @param props.admin - Authenticated admin performing the operation.
 * @param props.body - Filter and pagination criteria.
 * @returns Paginated summary list of chatbot admins.
 * @throws {Error} If database operation fails.
 */
export async function patchchatbotAdminChatbotAdmins(props: {
  admin: AdminPayload;
  body: IChatbotAdmin.IRequest;
}): Promise<IPageIChatbotAdmin.ISummary> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const whereCondition = {
    deleted_at: null as null,
    ...(body.nickname !== undefined &&
      body.nickname !== null && {
        nickname: { contains: body.nickname },
      }),
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.chatbot_admins.findMany({
      where: whereCondition,
      select: {
        id: true,
        internal_sender_id: true,
        nickname: true,
      },
      skip,
      take: limit,
      orderBy: { nickname: "asc" },
    }),
    MyGlobal.prisma.chatbot_admins.count({ where: whereCondition }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((admin) => ({
      id: admin.id,
      internal_sender_id: admin.internal_sender_id,
      nickname: admin.nickname,
    })),
  };
}
