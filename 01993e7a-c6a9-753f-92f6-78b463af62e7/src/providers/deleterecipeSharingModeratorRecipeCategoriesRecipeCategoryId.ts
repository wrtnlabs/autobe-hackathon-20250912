import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Delete a recipe category by its unique identifier.
 *
 * This operation permanently removes the recipe category record identified by
 * `recipeCategoryId` from the database. As recipe categories are fundamental to
 * recipe organization, deletion should be performed only by authorized
 * moderators with a clear need. Upon successful deletion, the category will no
 * longer be available for tagging or filtering recipes.
 *
 * @param props - Object containing the moderator's authentication payload and
 *   the ID of the recipe category to delete.
 * @param props.moderator - The authenticated moderator making the deletion
 *   request.
 * @param props.recipeCategoryId - The UUID of the recipe category to delete.
 * @returns Void
 * @throws {Error} Throws if the recipe category does not exist.
 */
export async function deleterecipeSharingModeratorRecipeCategoriesRecipeCategoryId(props: {
  moderator: ModeratorPayload;
  recipeCategoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { moderator, recipeCategoryId } = props;

  // Ensure the recipe category exists; throws if not found
  await MyGlobal.prisma.recipe_sharing_recipe_categories.findUniqueOrThrow({
    where: { id: recipeCategoryId },
  });

  // Hard delete the recipe category
  await MyGlobal.prisma.recipe_sharing_recipe_categories.delete({
    where: { id: recipeCategoryId },
  });
}
