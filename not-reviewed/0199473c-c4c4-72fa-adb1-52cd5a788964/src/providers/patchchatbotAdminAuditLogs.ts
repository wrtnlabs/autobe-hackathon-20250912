import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotChatbotAuditLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotChatbotAuditLogs";
import { IPageIChatbotChatbotAuditLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIChatbotChatbotAuditLogs";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and retrieve filtered, paginated list of audit logs.
 *
 * Retrieves audit logs from chatbot_audit_logs filtered by event_type,
 * chatbot_member_id, chatbot_room_tuple_id, and created_at date range. Supports
 * pagination. Unauthorized users are rejected outside this function by the
 * decorator.
 *
 * @param props - The properties including authenticated admin and filter body.
 * @param props.admin - Authenticated administrator executing the request.
 * @param props.body - Object containing filter criteria and pagination info.
 * @returns Paginated summary of audit logs matching filters.
 * @throws {Error} When pagination parameters are invalid.
 */
export async function patchchatbotAdminAuditLogs(props: {
  admin: AdminPayload;
  body: IChatbotChatbotAuditLogs.IRequest;
}): Promise<IPageIChatbotChatbotAuditLogs.ISummary> {
  const { admin, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  if (page < 1) throw new Error("Page must be >= 1");
  if (limit < 1) throw new Error("Limit must be >= 1");

  const skip = (page - 1) * limit;

  const whereConditions = {
    ...(body.event_type !== undefined &&
      body.event_type !== null && { event_type: body.event_type }),
    ...(body.chatbot_member_id !== undefined &&
      body.chatbot_member_id !== null && {
        chatbot_member_id: body.chatbot_member_id,
      }),
    ...(body.chatbot_room_tuple_id !== undefined &&
      body.chatbot_room_tuple_id !== null && {
        chatbot_room_tuple_id: body.chatbot_room_tuple_id,
      }),
    ...((body.created_at_from !== undefined && body.created_at_from !== null) ||
    (body.created_at_to !== undefined && body.created_at_to !== null)
      ? {
          created_at: {
            ...(body.created_at_from !== undefined &&
              body.created_at_from !== null && { gte: body.created_at_from }),
            ...(body.created_at_to !== undefined &&
              body.created_at_to !== null && { lte: body.created_at_to }),
          },
        }
      : {}),
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.chatbot_audit_logs.findMany({
      where: whereConditions,
      select: {
        id: true,
        chatbot_member_id: true,
        event_type: true,
        created_at: true,
      },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.chatbot_audit_logs.count({ where: whereConditions }),
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
      chatbot_member_id: item.chatbot_member_id ?? undefined,
      event_type: item.event_type,
      created_at: toISOStringSafe(item.created_at),
    })),
  };
}
