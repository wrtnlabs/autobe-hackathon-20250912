import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Permanently delete a virtual stock item by its unique identifier.
 *
 * This operation refunds all associated user holdings of the stock item by
 * adding their quantity back to their points balance, deletes all holdings, and
 * then hard deletes the stock item. Only admins can perform this operation.
 *
 * @param props - The operation props
 * @param props.admin - The administrator executing this operation
 * @param props.stockItemId - UUID of the stock item to delete
 * @throws {Error} Throws if the stock item does not exist
 */
export async function deletechatbotAdminStockItemsStockItemId(props: {
  admin: AdminPayload;
  stockItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, stockItemId } = props;

  // Find the stock item by ID
  const stockItem = await MyGlobal.prisma.chatbot_stock_items.findUnique({
    where: { id: stockItemId },
  });
  if (!stockItem) throw new Error("Stock item not found");

  // Fetch all active holdings for this stock item
  const holdings = await MyGlobal.prisma.chatbot_stock_holdings.findMany({
    where: { stock_item_id: stockItemId, deleted_at: null },
  });

  // Refund points to each holder
  for (const holding of holdings) {
    const pointRecord = await MyGlobal.prisma.chatbot_points.findUnique({
      where: { chatbot_member_id: holding.user_id },
    });

    if (pointRecord) {
      // Update existing points record
      await MyGlobal.prisma.chatbot_points.update({
        where: { chatbot_member_id: holding.user_id },
        data: { points: pointRecord.points + holding.quantity },
      });
    } else {
      // Create points record if not exists
      await MyGlobal.prisma.chatbot_points.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          chatbot_member_id: holding.user_id,
          points: holding.quantity,
          created_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
        },
      });
    }
  }

  // Delete all holdings records for this stock item
  await MyGlobal.prisma.chatbot_stock_holdings.deleteMany({
    where: { stock_item_id: stockItemId },
  });

  // Hard delete the stock item
  await MyGlobal.prisma.chatbot_stock_items.delete({
    where: { id: stockItemId },
  });
}
