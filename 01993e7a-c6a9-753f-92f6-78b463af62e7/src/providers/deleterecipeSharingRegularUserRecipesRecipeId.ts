import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Permanently deletes a recipe identified by recipeId from the database.
 *
 * This is a hard delete operation with no recovery possible.
 *
 * Only the owner user (regularUser) who created the recipe can perform this
 * operation.
 *
 * @param props - The properties for the deletion operation
 * @param props.regularUser - The authenticated regular user payload
 * @param props.recipeId - The UUID of the recipe to delete
 * @throws {Error} Throws error if the recipe does not exist or if the user is
 *   unauthorized
 */
export async function deleterecipeSharingRegularUserRecipesRecipeId(props: {
  regularUser: RegularuserPayload;
  recipeId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { regularUser, recipeId } = props;

  // Fetch the recipe to verify existence and ownership
  const recipe = await MyGlobal.prisma.recipe_sharing_recipes.findUniqueOrThrow(
    {
      where: { id: recipeId },
    },
  );

  // Verify the recipe belongs to the requesting user
  if (recipe.created_by_id !== regularUser.id) {
    throw new Error("Unauthorized: You do not own this recipe.");
  }

  // Perform hard delete
  await MyGlobal.prisma.recipe_sharing_recipes.delete({
    where: { id: recipeId },
  });
}
