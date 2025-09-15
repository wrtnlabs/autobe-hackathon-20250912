import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotStockItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotStockItem";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Creates a new chatbot stock item record in the database.
 *
 * This operation requires admin authentication and stores the unique code,
 * name, and initial price provided in the request body. It automatically
 * generates a UUID for the new stock item and sets creation and update
 * timestamps to the current time.
 *
 * @param props - Object containing the authenticated admin and the creation
 *   data.
 * @param props.admin - The authenticated admin user performing this operation.
 * @param props.body - The creation data for the new stock item.
 * @returns The newly created chatbot stock item object with all fields.
 * @throws {Error} When the creation fails due to database constraints or other
 *   errors.
 */
export async function postchatbotAdminStockItems(props: {
  admin: AdminPayload;
  body: IChatbotStockItem.ICreate;
}): Promise<IChatbotStockItem> {
  const { admin, body } = props;

  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.chatbot_stock_items.create({
    data: {
      id,
      code: body.code,
      name: body.name,
      initial_price: body.initial_price,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    code: created.code,
    name: created.name,
    initial_price: created.initial_price,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
