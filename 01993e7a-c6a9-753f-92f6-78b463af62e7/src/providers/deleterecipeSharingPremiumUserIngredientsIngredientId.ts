import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { PremiumuserPayload } from "../decorators/payload/PremiumuserPayload";

/**
 * Permanently deletes an ingredient from the recipe_sharing_ingredients table
 * by its unique identifier.
 *
 * This operation performs a hard delete, removing the record entirely without
 * considering soft delete timestamps. Only authorized premium users may perform
 * this deletion.
 *
 * @param props - Object containing the authenticated premium user and the
 *   target ingredient ID.
 * @param props.premiumUser - The authenticated premium user executing the
 *   deletion.
 * @param props.ingredientId - The UUID of the ingredient to delete.
 * @returns Void
 * @throws {Error} Throws error with message "Ingredient not found" if the
 *   specified ingredient does not exist.
 */
export async function deleterecipeSharingPremiumUserIngredientsIngredientId(props: {
  premiumUser: PremiumuserPayload;
  ingredientId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { premiumUser, ingredientId } = props;

  // Verify ingredient exists
  const ingredient =
    await MyGlobal.prisma.recipe_sharing_ingredients.findUnique({
      where: { id: ingredientId },
    });

  if (!ingredient) {
    throw new Error("Ingredient not found");
  }

  // Perform permanent deletion
  await MyGlobal.prisma.recipe_sharing_ingredients.delete({
    where: { id: ingredientId },
  });
}
