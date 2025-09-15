import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotStockPriceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotStockPriceSnapshot";
import { IPageIChatbotStockPriceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIChatbotStockPriceSnapshot";

/**
 * Searches and retrieves a paginated list of virtual stock price snapshots.
 *
 * Allows clients to filter by stock item ID and snapshot time ranges.
 *
 * Supports pagination and sorting by snapshot time in descending order.
 *
 * @param props - Object containing the request body for filters and pagination
 * @param props.body - Filter, sort, and paginate request parameters
 * @returns Paginated result of stock price snapshots matching the criteria
 * @throws {Error} If any unexpected error occurs during database operations
 */
export async function patchchatbotStockPriceSnapshots(props: {
  body: IChatbotStockPriceSnapshot.IRequest;
}): Promise<IPageIChatbotStockPriceSnapshot> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Build the where filter conditions
  const where: {
    stock_item_id?: string & tags.Format<"uuid">;
    snapshot_time?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
  } = {};

  if (body.filterStockItemId !== undefined && body.filterStockItemId !== null) {
    where.stock_item_id = body.filterStockItemId;
  }
  if (
    (body.filterSnapshotTimeFrom !== undefined &&
      body.filterSnapshotTimeFrom !== null) ||
    (body.filterSnapshotTimeTo !== undefined &&
      body.filterSnapshotTimeTo !== null)
  ) {
    where.snapshot_time = {};
    if (
      body.filterSnapshotTimeFrom !== undefined &&
      body.filterSnapshotTimeFrom !== null
    ) {
      where.snapshot_time.gte = body.filterSnapshotTimeFrom;
    }
    if (
      body.filterSnapshotTimeTo !== undefined &&
      body.filterSnapshotTimeTo !== null
    ) {
      where.snapshot_time.lte = body.filterSnapshotTimeTo;
    }
  }

  const sortField =
    body.sortBy === "snapshot_time" ? "snapshot_time" : "snapshot_time";

  const sortOrder: "asc" | "desc" = "desc";

  const [results, total] = await Promise.all([
    MyGlobal.prisma.chatbot_stock_price_snapshots.findMany({
      where,
      orderBy: {
        [sortField]: sortOrder,
      },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.chatbot_stock_price_snapshots.count({
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
      stock_item_id: item.stock_item_id,
      price: item.price,
      snapshot_time: toISOStringSafe(item.snapshot_time),
    })),
  };
}
