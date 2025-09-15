import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotTitles } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotTitles";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update a user title by ID
 *
 * This function updates an existing user title entity identified by its UUID in
 * the chatbot_titles table. It supports partial updates to the name, fee
 * discount rate, and deleted_at timestamp.
 *
 * Admin authorization must be verified prior to calling this.
 *
 * @param props - Object containing admin payload, title ID, and update body
 * @param props.admin - Authenticated admin performing the update
 * @param props.id - UUID of the title to update
 * @param props.body - Partial update fields conforming to
 *   IChatbotTitles.IUpdate
 * @returns The updated user title entity conforming to IChatbotTitles
 * @throws {Error} Throws if title with given ID does not exist
 */
export async function putchatbotAdminTitlesId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IChatbotTitles.IUpdate;
}): Promise<IChatbotTitles> {
  const { admin, id, body } = props;

  // Ensure the title exists; throws if not
  await MyGlobal.prisma.chatbot_titles.findUniqueOrThrow({
    where: { id },
  });

  const updated = await MyGlobal.prisma.chatbot_titles.update({
    where: { id },
    data: {
      name: body.name ?? undefined,
      fee_discount_rate: body.fee_discount_rate ?? undefined,
      deleted_at:
        body.deleted_at === null ? null : (body.deleted_at ?? undefined),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    name: updated.name,
    fee_discount_rate: updated.fee_discount_rate,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
