import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingIngredient } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingIngredient";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Updates the details of a specific ingredient in the
 * recipe_sharing_ingredients table.
 *
 * Only authenticated regular users can perform this update. Ensures the
 * ingredient name remains unique among all ingredients.
 *
 * @param props - The properties required for this operation.
 * @param props.regularUser - Authenticated regular user performing the update.
 * @param props.ingredientId - UUID of the ingredient to update.
 * @param props.body - The data containing updated ingredient details.
 * @returns The updated ingredient record with all dates in ISO string format.
 * @throws {Error} Throws if the ingredient does not exist or if the name
 *   conflicts.
 */
export async function putrecipeSharingRegularUserIngredientsIngredientId(props: {
  regularUser: RegularuserPayload;
  ingredientId: string & tags.Format<"uuid">;
  body: IRecipeSharingIngredient.IUpdate;
}): Promise<IRecipeSharingIngredient> {
  const { regularUser, ingredientId, body } = props;

  // Retrieve the existing ingredient or throw 404
  const existingIngredient =
    await MyGlobal.prisma.recipe_sharing_ingredients.findUniqueOrThrow({
      where: { id: ingredientId },
    });

  // Validate name uniqueness if name provided and different
  if (body.name !== undefined && body.name !== existingIngredient.name) {
    const conflict = await MyGlobal.prisma.recipe_sharing_ingredients.findFirst(
      {
        where: { name: body.name },
      },
    );

    if (conflict !== null && conflict.id !== ingredientId) {
      throw new Error(`Ingredient name '${body.name}' already exists.`);
    }
  }

  // Build update data with conditional inclusion
  const updatedData = {
    ...(body.name !== undefined && { name: body.name }),
    brand: body.brand === null ? null : (body.brand ?? undefined),
    updated_at: toISOStringSafe(new Date()),
  };

  // Perform update
  const updatedIngredient =
    await MyGlobal.prisma.recipe_sharing_ingredients.update({
      where: { id: ingredientId },
      data: updatedData,
    });

  // Return updated ingredient with date conversion
  return {
    id: updatedIngredient.id,
    name: updatedIngredient.name,
    brand: updatedIngredient.brand ?? null,
    created_at: toISOStringSafe(updatedIngredient.created_at),
    updated_at: toISOStringSafe(updatedIngredient.updated_at),
  };
}
