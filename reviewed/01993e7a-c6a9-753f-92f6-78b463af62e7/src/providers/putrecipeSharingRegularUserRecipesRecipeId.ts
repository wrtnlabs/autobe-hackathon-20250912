import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingRecipes } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipes";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Updates an existing recipe entry belonging to the authenticated regular user.
 *
 * This operation enforces ownership verification, allowing only the recipe
 * creator to update mutable fields such as title, description, and status.
 *
 * The updated_at timestamp is refreshed upon successful update.
 *
 * @param props - Object containing the authenticated regular user, recipe ID,
 *   and update data.
 * @param props.regularUser - Authenticated regular user payload.
 * @param props.recipeId - UUID of the target recipe to update.
 * @param props.body - Partial update information including optional title,
 *   description, and status.
 * @returns The complete updated recipe object conforming to the
 *   IRecipeSharingRecipes interface.
 * @throws {Error} Throws if the recipe is not found or the user is not the
 *   owner.
 */
export async function putrecipeSharingRegularUserRecipesRecipeId(props: {
  regularUser: RegularuserPayload;
  recipeId: string & tags.Format<"uuid">;
  body: IRecipeSharingRecipes.IUpdate;
}): Promise<IRecipeSharingRecipes> {
  const { regularUser, recipeId, body } = props;

  // Fetch the recipe to ensure existence and ownership
  const recipe = await MyGlobal.prisma.recipe_sharing_recipes.findUnique({
    where: { id: recipeId },
  });

  if (!recipe) throw new Error("Recipe not found");

  if (recipe.created_by_id !== regularUser.id) {
    throw new Error("Unauthorized: You can only update your own recipes");
  }

  // Update mutable fields with non-undefined values
  const updated = await MyGlobal.prisma.recipe_sharing_recipes.update({
    where: { id: recipeId },
    data: {
      title: body.title ?? undefined,
      description: body.description ?? undefined,
      status: body.status ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return the updated recipe with all fields converted properly
  return {
    id: updated.id,
    created_by_id: updated.created_by_id,
    title: updated.title,
    description: updated.description ?? null,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
