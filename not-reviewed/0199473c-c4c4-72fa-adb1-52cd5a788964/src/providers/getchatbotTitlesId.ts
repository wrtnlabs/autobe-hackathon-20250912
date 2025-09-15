import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotTitles } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotTitles";

/**
 * Retrieve detailed information of a specific user title by its UUID.
 *
 * This operation retrieves the user title record, including its name, fee
 * discount rate, creation and update timestamps, and optional deletion
 * timestamp.
 *
 * @param props - Object containing the UUID of the user title to retrieve
 * @param props.id - Unique identifier (UUID) of the user title
 * @returns The detailed user title information as IChatbotTitles
 * @throws {Error} Throws if the user title with the specified UUID does not
 *   exist
 */
export async function getchatbotTitlesId(props: {
  id: string & tags.Format<"uuid">;
}): Promise<IChatbotTitles> {
  const { id } = props;
  const title = await MyGlobal.prisma.chatbot_titles.findUniqueOrThrow({
    where: { id },
  });

  return {
    id: title.id as string & tags.Format<"uuid">,
    name: title.name,
    fee_discount_rate: title.fee_discount_rate,
    created_at: toISOStringSafe(title.created_at),
    updated_at: toISOStringSafe(title.updated_at),
    deleted_at: title.deleted_at ? toISOStringSafe(title.deleted_at) : null,
  };
}
