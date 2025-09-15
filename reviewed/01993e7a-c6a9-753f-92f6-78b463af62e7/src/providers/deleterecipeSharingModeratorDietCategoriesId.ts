import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Delete a diet category
 *
 * This operation deletes a diet category identified by its unique ID from the
 * database. It performs a hard deletion, permanently removing the diet
 * category. Authorization is required; only authenticated moderator users can
 * perform this operation.
 *
 * @param props - Object containing moderator information and ID of the diet
 *   category
 * @param props.moderator - The authenticated moderator performing the deletion
 * @param props.id - The unique ID of the diet category to be deleted
 * @throws {Error} Throws if the diet category with the specified ID does not
 *   exist
 */
export async function deleterecipeSharingModeratorDietCategoriesId(props: {
  moderator: ModeratorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { moderator, id } = props;

  // Check existence of diet category to delete
  await MyGlobal.prisma.recipe_sharing_diet_categories.findUniqueOrThrow({
    where: { id },
  });

  // Hard delete the diet category
  await MyGlobal.prisma.recipe_sharing_diet_categories.delete({
    where: { id },
  });
}
