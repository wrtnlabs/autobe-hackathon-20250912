import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingIngredient } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingIngredient";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Retrieve detailed information of an ingredient by ingredientId.
 *
 * Accessible to authenticated regularUser role only. Returns full ingredient
 * data including id, name, optional brand, created_at, and updated_at. Throws
 * if the ingredient does not exist.
 *
 * @param props - Object containing:
 *
 *   - RegularUser: Authenticated regular user payload
 *   - IngredientId: UUID of the ingredient to retrieve
 *
 * @returns Detailed ingredient information conforming to
 *   IRecipeSharingIngredient
 * @throws {Error} When the ingredient with the given ingredientId is not found
 */
export async function getrecipeSharingRegularUserIngredientsIngredientId(props: {
  regularUser: RegularuserPayload;
  ingredientId: string & tags.Format<"uuid">;
}): Promise<IRecipeSharingIngredient> {
  const { ingredientId } = props;

  const ingredient =
    await MyGlobal.prisma.recipe_sharing_ingredients.findUniqueOrThrow({
      where: { id: ingredientId },
      select: {
        id: true,
        name: true,
        brand: true,
        created_at: true,
        updated_at: true,
      },
    });

  return {
    id: ingredient.id,
    name: ingredient.name,
    brand: ingredient.brand ?? undefined,
    created_at: toISOStringSafe(ingredient.created_at),
    updated_at: toISOStringSafe(ingredient.updated_at),
  };
}
