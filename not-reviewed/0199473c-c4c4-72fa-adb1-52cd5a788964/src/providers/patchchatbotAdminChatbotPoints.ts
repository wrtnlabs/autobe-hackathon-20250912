import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotPoints } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotPoints";
import { IPageIChatbotPoints } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIChatbotPoints";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and retrieve paginated chatbot points for members with optional
 * filtering.
 *
 * Accessible only by authorized admin users.
 *
 * Supports filtering by member ID, minimum and maximum points, pagination
 * parameters, and sorting options.
 *
 * @param props - Object containing admin authorization and request body with
 *   filters.
 * @param props.admin - Authenticated admin payload.
 * @param props.body - Request body containing search filters and pagination
 *   details.
 * @returns Paginated list of chatbot points matching the filters.
 * @throws Error if database query fails or parameters are invalid.
 */
export async function patchchatbotAdminChatbotPoints(props: {
  admin: AdminPayload;
  body: IChatbotPoints.IRequest;
}): Promise<IPageIChatbotPoints> {
  const { admin, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const where = {
    ...(body.chatbot_member_id !== undefined &&
      body.chatbot_member_id !== null && {
        chatbot_member_id: body.chatbot_member_id,
      }),
    ...(body.min_points !== undefined &&
      body.min_points !== null && {
        points: { gte: body.min_points },
      }),
    ...(body.max_points !== undefined && body.max_points !== null
      ? {
          points: {
            ...(body.min_points !== undefined && body.min_points !== null
              ? { gte: body.min_points }
              : {}),
            lte: body.max_points,
          },
        }
      : {}),
  };

  const sortBy = body.sort_by ?? "created_at";
  const sortDirection = body.sort_direction ?? "desc";

  const [results, total] = await Promise.all([
    MyGlobal.prisma.chatbot_points.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortDirection },
    }),
    MyGlobal.prisma.chatbot_points.count({ where }),
  ]);

  const data = results.map((r) => ({
    id: r.id,
    chatbot_member_id: r.chatbot_member_id,
    points: r.points,
    created_at: toISOStringSafe(r.created_at),
    updated_at: toISOStringSafe(r.updated_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
