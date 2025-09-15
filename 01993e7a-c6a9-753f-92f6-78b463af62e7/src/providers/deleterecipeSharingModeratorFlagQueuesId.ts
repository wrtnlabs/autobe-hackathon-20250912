import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Delete a flag queue entry by ID
 *
 * This operation allows authorized moderators to permanently delete a flag
 * queue entry identified by its UUID from the recipe_sharing_flag_queues table.
 * It performs a hard delete, removing the entry from the database completely.
 *
 * @param props - Object containing the moderator payload and flag queue entry
 *   ID
 * @param props.moderator - Authenticated moderator performing the deletion
 * @param props.id - The UUID of the flag queue entry to delete
 * @throws {Error} Throws if the specified ID does not exist or deletion fails
 */
export async function deleterecipeSharingModeratorFlagQueuesId(props: {
  moderator: ModeratorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { id } = props;

  await MyGlobal.prisma.recipe_sharing_flag_queues.delete({
    where: { id },
  });
}
