import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotCommandLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotCommandLog";
import { IPageIChatbotCommandLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIChatbotCommandLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and list chatbot command logs with filters and pagination.
 *
 * This operation retrieves a paginated list of chatbot command logs executed by
 * chatbot members. Allows filtering by command text search and sorting with
 * pagination support.
 *
 * Only users with admin role can perform this operation.
 *
 * @param props - Object containing admin authentication and request body
 * @param props.admin - Authenticated admin payload
 * @param props.body - Request body with search, sort, page, and limit
 * @returns Paginated summary list of chatbot command logs matching criteria
 * @throws {Error} When authorization fails or database errors occur
 */
export async function patchchatbotAdminChatbotCommandLogs(props: {
  admin: AdminPayload;
  body: IChatbotCommandLog.IRequest;
}): Promise<IPageIChatbotCommandLog.ISummary> {
  const { admin, body } = props;

  // Default pagination values
  const page = (body.page ?? 1) as number & tags.Type<"int32">;
  const limit = (body.limit ?? 10) as number & tags.Type<"int32">;
  const skip = (page - 1) * limit;

  // Build where condition
  const where: { command?: { contains: string } } = {};
  if (body.search !== undefined && body.search !== null && body.search !== "") {
    where.command = { contains: body.search };
  }

  // Parse sort parameter
  let sortField: "created_at" | "command" = "created_at";
  let sortOrder: "asc" | "desc" = "desc";
  if (body.sort) {
    const parts = body.sort.trim().split(" ");
    if (parts.length >= 1) {
      const field = parts[0];
      if (field === "created_at" || field === "command") {
        sortField = field;
      }
    }
    if (parts.length >= 2 && (parts[1] === "asc" || parts[1] === "desc")) {
      sortOrder = parts[1];
    }
  }

  // Query records and count
  const [records, total] = await Promise.all([
    MyGlobal.prisma.chatbot_command_logs.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.chatbot_command_logs.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((record) => ({
      id: record.id,
      chatbot_member_id: record.chatbot_member_id,
      command: record.command,
      created_at: toISOStringSafe(record.created_at),
    })),
  };
}
