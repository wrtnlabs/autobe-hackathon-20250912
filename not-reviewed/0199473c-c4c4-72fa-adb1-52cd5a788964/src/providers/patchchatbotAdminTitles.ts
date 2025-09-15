import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotChatbotTitle } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotChatbotTitle";
import { IPageIChatbotChatbotTitle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIChatbotChatbotTitle";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves a paginated list of user titles with optional filtering by name and
 * fee discount rate.
 *
 * This endpoint is restricted to admin users only and provides read-only access
 * to titles.
 *
 * @param props - Object containing the authenticated admin and request body
 *   with filter options
 * @param props.admin - Authenticated admin user payload
 * @param props.body - Filtering and pagination options
 * @returns A paginated list of user titles conforming to
 *   IPageIChatbotChatbotTitle
 * @throws {Error} Throws if database operations fail
 */
export async function patchchatbotAdminTitles(props: {
  admin: AdminPayload;
  body: IChatbotChatbotTitle.IRequest;
}): Promise<IPageIChatbotChatbotTitle> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (body.search !== undefined && body.search !== null) {
    where.name = { contains: body.search };
  }
  if (
    body.fee_discount_rate_min !== undefined &&
    body.fee_discount_rate_min !== null
  ) {
    where.fee_discount_rate = {
      ...((where.fee_discount_rate as object) ?? {}),
      gte: body.fee_discount_rate_min,
    };
  }
  if (
    body.fee_discount_rate_max !== undefined &&
    body.fee_discount_rate_max !== null
  ) {
    where.fee_discount_rate = {
      ...((where.fee_discount_rate as object) ?? {}),
      lte: body.fee_discount_rate_max,
    };
  }

  where.deleted_at = null;

  const [total, data] = await Promise.all([
    MyGlobal.prisma.chatbot_titles.count({ where }),
    MyGlobal.prisma.chatbot_titles.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
  ]);

  const results = data.map((item) => ({
    id: item.id as string & tags.Format<"uuid">,
    name: item.name,
    fee_discount_rate: item.fee_discount_rate as number & tags.Type<"int32">,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
    deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
  }));

  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data: results,
  };
}
