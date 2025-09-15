import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingRecipes } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipes";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Retrieve detailed information of a recipe by ID.
 *
 * This function fetches all relevant recipe fields for a given recipe ID,
 * ensuring only active (not soft deleted) recipes are returned.
 *
 * @param props - Object containing authentication payload and recipe ID
 * @param props.regularUser - Authenticated regular user payload
 * @param props.recipeId - UUID of the recipe to fetch details for
 * @returns Detailed recipe data conforming to IRecipeSharingRecipes
 * @throws Error if no recipe found or recipe is soft deleted
 */
export async function getrecipeSharingRegularUserRecipesRecipeId(props: {
  regularUser: RegularuserPayload;
  recipeId: string & tags.Format<"uuid">;
}): Promise<IRecipeSharingRecipes> {
  const { regularUser, recipeId } = props;

  const recipe = await MyGlobal.prisma.recipe_sharing_recipes.findFirstOrThrow({
    where: {
      id: recipeId,
      deleted_at: null,
    },
  });

  return {
    id: recipe.id,
    created_by_id: recipe.created_by_id,
    title: recipe.title,
    description: recipe.description ?? null,
    status: recipe.status,
    created_at: toISOStringSafe(recipe.created_at),
    updated_at: toISOStringSafe(recipe.updated_at),
    deleted_at: recipe.deleted_at ? toISOStringSafe(recipe.deleted_at) : null,
  };
}
