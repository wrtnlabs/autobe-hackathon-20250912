import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotTitles } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotTitles";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new user title in the chatbot_titles table.
 *
 * This operation adds a new title with the specified name and fee discount
 * rate. Only administrators with proper authorization can perform this action.
 *
 * @param props - Object containing the admin payload and request body
 * @param props.admin - Authenticated admin performing the operation
 * @param props.body - Data for creating a new chatbot title, includes name and
 *   fee discount rate
 * @returns The newly created user title entity with all fields populated
 * @throws {Error} If the creation operation fails due to database or constraint
 *   errors
 */
export async function postchatbotAdminTitles(props: {
  admin: AdminPayload;
  body: IChatbotTitles.ICreate;
}): Promise<IChatbotTitles> {
  const { body } = props;
  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.chatbot_titles.create({
    data: {
      id,
      name: body.name,
      fee_discount_rate: body.fee_discount_rate,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    name: created.name,
    fee_discount_rate: created.fee_discount_rate,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ?? null,
  };
}
