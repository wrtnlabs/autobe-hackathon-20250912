import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotStockItems } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotStockItems";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update a virtual stock item's details by ID.
 *
 * This operation updates the code, name, initial price, and optionally the
 * deleted timestamp of a chatbot stock item identified by its UUID.
 *
 * Authorization: Requires an admin user.
 *
 * @param props - Object containing admin user, stock item ID, and update body.
 * @param props.admin - Authenticated admin performing the update.
 * @param props.stockItemId - UUID of the stock item to update.
 * @param props.body - Update payload with code, name, initial price, and
 *   optional deleted_at.
 * @returns The updated chatbot stock item.
 * @throws {Error} When the stock item is not found.
 * @throws {Error} When the new code is duplicated.
 * @throws {Error} When the new name is duplicated.
 * @throws {Error} When the initial price is invalid.
 */
export async function putchatbotAdminStockItemsStockItemId(props: {
  admin: AdminPayload;
  stockItemId: string & tags.Format<"uuid">;
  body: IChatbotStockItems.IUpdate;
}): Promise<IChatbotStockItems> {
  const { admin, stockItemId, body } = props;

  // Check stock item exists
  const existing = await MyGlobal.prisma.chatbot_stock_items.findUnique({
    where: { id: stockItemId },
  });
  if (!existing) throw new Error("Stock item not found");

  // Check for code duplication with other records
  const codeConflict = await MyGlobal.prisma.chatbot_stock_items.findFirst({
    where: {
      code: body.code,
      NOT: { id: stockItemId },
    },
  });
  if (codeConflict) throw new Error("Duplicate code");

  // Check for name duplication with other records
  const nameConflict = await MyGlobal.prisma.chatbot_stock_items.findFirst({
    where: {
      name: body.name,
      NOT: { id: stockItemId },
    },
  });
  if (nameConflict) throw new Error("Duplicate name");

  // Validate initial_price
  if (body.initial_price < 100 || body.initial_price > 1000000) {
    throw new Error("Invalid initial_price");
  }

  // Prepare updated_at
  const now = toISOStringSafe(new Date());

  // Update stock item
  const updated = await MyGlobal.prisma.chatbot_stock_items.update({
    where: { id: stockItemId },
    data: {
      code: body.code,
      name: body.name,
      initial_price: body.initial_price,
      deleted_at: body.deleted_at ?? undefined,
      updated_at: now,
    },
  });

  // Return with date fields string formatted
  return {
    id: updated.id,
    code: updated.code,
    name: updated.name,
    initial_price: updated.initial_price,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
