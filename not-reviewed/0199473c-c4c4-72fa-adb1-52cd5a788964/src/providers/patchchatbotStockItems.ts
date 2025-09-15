import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotStockItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotStockItem";
import { IPageIChatbotStockItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIChatbotStockItem";

/**
 * Retrieves a filtered and paginated list of virtual stock items available for
 * trading.
 *
 * This read-only operation supports filters for stock code and name, pagination
 * parameters, and sorting order.
 *
 * @param props - An object containing the filtering and pagination request
 *   body.
 * @param props.body - Filtering, pagination, and sorting parameters.
 * @returns A paginated summary list of chatbot stock items.
 * @throws {Error} Throws if Prisma queries fail or invalid parameters are
 *   provided.
 */
export async function patchchatbotStockItems(props: {
  body: IChatbotStockItem.IRequest;
}): Promise<IPageIChatbotStockItem.ISummary> {
  const body = props.body;

  // Normalize pagination parameters with default values
  const page = body.page === null || body.page === undefined ? 1 : body.page;
  const limit =
    body.limit === null || body.limit === undefined ? 10 : body.limit;
  const skip = (page - 1) * limit;

  // Build the where condition object
  const whereCondition = {
    deleted_at: null,
    ...(body.code !== undefined &&
      body.code !== null && { code: { contains: body.code } }),
    ...(body.name !== undefined &&
      body.name !== null && { name: { contains: body.name } }),
  };

  // Determine order direction: only 'asc' or 'desc' on created_at allowed
  const orderByCondition = {} as Record<string, "asc" | "desc">;
  if (body.order !== undefined && body.order !== null) {
    const lowerOrder = body.order.toLowerCase();
    if (lowerOrder === "asc" || lowerOrder === "desc") {
      orderByCondition.created_at = lowerOrder;
    }
  }

  // Default order by created_at desc if not set
  if (!orderByCondition.created_at) {
    orderByCondition.created_at = "desc";
  }

  // Fetch data and total count concurrently
  const [items, totalCount] = await Promise.all([
    MyGlobal.prisma.chatbot_stock_items.findMany({
      where: whereCondition,
      orderBy: orderByCondition,
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.chatbot_stock_items.count({ where: whereCondition }),
  ]);

  // Map Prisma results to API summary type
  const data = items.map((item) => ({
    id: item.id,
    code: item.code,
    name: item.name,
    initial_price: item.initial_price,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: totalCount,
      pages: Math.ceil(totalCount / limit),
    },
    data: data,
  };
}
