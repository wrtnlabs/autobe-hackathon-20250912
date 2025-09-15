import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Permanently deletes the specified ingredient from the
 * recipe_sharing_ingredients table.
 *
 * This operation performs a hard delete (no soft delete). Only authorized
 * regular users can perform this action.
 *
 * @param props - Object containing the authenticated regular user and
 *   ingredientId.
 * @param props.regularUser - The authenticated regular user payload.
 * @param props.ingredientId - The UUID of the ingredient to delete.
 * @returns Void - No response body upon successful deletion.
 * @throws {Error} When the ingredient with the specified ID does not exist.
 */
export async function deleterecipeSharingRegularUserIngredientsIngredientId(props: {
  regularUser: RegularuserPayload;
  ingredientId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { regularUser, ingredientId } = props;

  // Verify ingredient exists
  const ingredient =
    await MyGlobal.prisma.recipe_sharing_ingredients.findUnique({
      where: {
        id: ingredientId,
      },
    });

  if (!ingredient) {
    throw new Error(`Ingredient not found: ${ingredientId}`);
  }

  // Proceed with hard delete
  await MyGlobal.prisma.recipe_sharing_ingredients.delete({
    where: {
      id: ingredientId,
    },
  });
}
