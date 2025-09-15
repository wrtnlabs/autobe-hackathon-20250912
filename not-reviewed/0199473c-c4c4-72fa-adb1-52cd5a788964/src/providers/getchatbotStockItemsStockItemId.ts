import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotStockItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotStockItem";

/**
 * Retrieve detailed information of a chatbot stock item by ID.
 *
 * Fetches the full stock item record from the database, including unique code,
 * name, initial price, and timestamps.
 *
 * This operation is publicly accessible and requires no authentication.
 *
 * @param props - Object containing the required stockItemId parameter.
 * @param props.stockItemId - Unique UUID identifier of the stock item to
 *   retrieve.
 * @returns The complete chatbot stock item details conforming to
 *   IChatbotStockItem.
 * @throws {Error} Throws if the stock item with the given ID does not exist.
 */
export async function getchatbotStockItemsStockItemId(props: {
  stockItemId: string & tags.Format<"uuid">;
}): Promise<IChatbotStockItem> {
  const { stockItemId } = props;

  const item = await MyGlobal.prisma.chatbot_stock_items.findUniqueOrThrow({
    where: { id: stockItemId },
  });

  return {
    id: item.id as string & tags.Format<"uuid">,
    code: item.code,
    name: item.name,
    initial_price: item.initial_price as number & tags.Type<"int32">,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
    deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
  };
}
