import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotStockPriceUpdate } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotStockPriceUpdate";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve details of a specific stock price update event.
 *
 * This operation fetches the stock price update identified by the unique
 * `stockPriceUpdateId`. The information includes the admin who made the update
 * (if any), the update date, any notes, and the creation timestamp.
 *
 * Access to this data is restricted to authorized admin users.
 *
 * @param props - Object containing the authenticated admin and the ID of the
 *   stock price update to retrieve
 * @param props.admin - Authenticated admin user making the request
 * @param props.stockPriceUpdateId - UUID of the stock price update event
 * @returns Detailed stock price update event information
 * @throws {Error} If no stock price update with the given ID is found
 */
export async function getchatbotAdminStockPriceUpdatesStockPriceUpdateId(props: {
  admin: AdminPayload;
  stockPriceUpdateId: string & tags.Format<"uuid">;
}): Promise<IChatbotStockPriceUpdate> {
  const { admin, stockPriceUpdateId } = props;

  const record =
    await MyGlobal.prisma.chatbot_stock_price_updates.findUniqueOrThrow({
      where: { id: stockPriceUpdateId },
    });

  return {
    id: record.id as string & tags.Format<"uuid">,
    updated_by_admin_id:
      record.updated_by_admin_id === null
        ? undefined
        : (record.updated_by_admin_id as
            | (string & tags.Format<"uuid">)
            | undefined),
    update_date: toISOStringSafe(record.update_date),
    notes: record.notes ?? undefined,
    created_at: toISOStringSafe(record.created_at),
  };
}
