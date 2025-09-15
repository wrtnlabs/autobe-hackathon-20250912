import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Delete a moderator action by ID
 *
 * This operation permanently removes the audit log entry for the moderation
 * activity. Only authorized moderators can execute this operation.
 *
 * @param props - Object containing moderator authentication and the ID of the
 *   moderation action to delete
 * @param props.moderator - The authenticated moderator performing the deletion
 * @param props.id - UUID of the moderator action to delete
 * @throws {Error} When the specified moderator action ID does not exist
 */
export async function deleterecipeSharingModeratorModeratorActionsId(props: {
  moderator: ModeratorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { id } = props;

  // Ensure the record exists or throw
  await MyGlobal.prisma.recipe_sharing_moderator_actions.findUniqueOrThrow({
    where: { id },
  });

  // Perform hard delete
  await MyGlobal.prisma.recipe_sharing_moderator_actions.delete({
    where: { id },
  });
}
