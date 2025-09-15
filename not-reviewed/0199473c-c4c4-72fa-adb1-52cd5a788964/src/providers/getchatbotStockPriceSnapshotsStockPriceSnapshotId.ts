import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotStockPriceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotStockPriceSnapshot";

/**
 * Retrieve details of a specific stock price snapshot
 *
 * This function fetches an immutable historical price snapshot for a virtual
 * stock item identified by its unique ID. It returns the snapshot with stock
 * item ID, snapshot timestamp, and price in points.
 *
 * @param props - Object containing the stockPriceSnapshotId
 * @param props.stockPriceSnapshotId - Unique identifier of the virtual stock
 *   price snapshot
 * @returns Detailed information of the specified stock price snapshot
 * @throws {Error} Throws if the stock price snapshot with the given ID does not
 *   exist
 */
export async function getchatbotStockPriceSnapshotsStockPriceSnapshotId(props: {
  stockPriceSnapshotId: string & tags.Format<"uuid">;
}): Promise<IChatbotStockPriceSnapshot> {
  const snapshot =
    await MyGlobal.prisma.chatbot_stock_price_snapshots.findUniqueOrThrow({
      where: { id: props.stockPriceSnapshotId },
    });

  return {
    id: snapshot.id,
    stock_item_id: snapshot.stock_item_id,
    price: snapshot.price,
    snapshot_time: toISOStringSafe(snapshot.snapshot_time),
  };
}
