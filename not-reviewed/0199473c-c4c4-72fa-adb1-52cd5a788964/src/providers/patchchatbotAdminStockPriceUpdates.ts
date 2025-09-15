import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotStockPriceUpdate } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotStockPriceUpdate";
import { IPageIChatbotStockPriceUpdate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIChatbotStockPriceUpdate";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Searches and returns a paginated list of chatbot stock price update events.
 *
 * This function filters results by optional filter criteria in the request
 * body, including admin ID, update date ranges, and supports sorting and
 * pagination.
 *
 * All date fields are converted to ISO 8601 string format with branding for
 * type safety.
 *
 * @param props - Object containing admin payload and request filter parameters
 * @param props.admin - Authenticated admin payload (authorization assumed
 *   handled upstream)
 * @param props.body - Filter and pagination criteria for querying stock price
 *   updates
 * @returns A paginated list of IChatbotStockPriceUpdate records matching the
 *   criteria
 * @throws Error if critical failures occur during database interaction
 */
export async function patchchatbotAdminStockPriceUpdates(props: {
  admin: AdminPayload;
  body: IChatbotStockPriceUpdate.IRequest;
}): Promise<IPageIChatbotStockPriceUpdate> {
  const { admin, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const where: {
    updated_by_admin_id?: string & tags.Format<"uuid">;
    update_date?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
  } = {};

  if (
    body.updated_by_admin_id !== undefined &&
    body.updated_by_admin_id !== null
  ) {
    where.updated_by_admin_id = body.updated_by_admin_id;
  }

  if (body.update_date_gte !== undefined && body.update_date_gte !== null) {
    where.update_date = where.update_date ?? {};
    where.update_date.gte = body.update_date_gte;
  }

  if (body.update_date_lte !== undefined && body.update_date_lte !== null) {
    where.update_date = where.update_date ?? {};
    where.update_date.lte = body.update_date_lte;
  }

  const orderByField =
    body.orderBy === "created_at" ? "created_at" : "update_date";
  const orderDirection = body.direction === "asc" ? "asc" : "desc";

  const [records, total] = await Promise.all([
    MyGlobal.prisma.chatbot_stock_price_updates.findMany({
      where,
      orderBy: { [orderByField]: orderDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.chatbot_stock_price_updates.count({
      where,
    }),
  ]);

  const data = records.map((r) => ({
    id: r.id,
    updated_by_admin_id: r.updated_by_admin_id ?? null,
    update_date: toISOStringSafe(r.update_date),
    notes: r.notes ?? null,
    created_at: toISOStringSafe(r.created_at),
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
