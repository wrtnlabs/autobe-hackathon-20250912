import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Delete a moderator user by ID
 *
 * This operation permanently deletes a moderator user identified by the unique
 * ID provided as a path parameter. It performs a hard delete that permanently
 * removes the record from the recipe_sharing_moderators table.
 *
 * Only users with the 'moderator' role can execute this action.
 *
 * @param props - Parameters including moderator authorization and target ID to
 *   delete
 * @param props.moderator - Authenticated moderator performing the delete
 * @param props.id - UUID of the moderator user to delete
 * @throws {Error} Throws if the specified moderator does not exist
 */
export async function deleterecipeSharingModeratorModeratorsId(props: {
  moderator: ModeratorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.recipe_sharing_moderators.delete({
    where: { id: props.id },
  });
}
