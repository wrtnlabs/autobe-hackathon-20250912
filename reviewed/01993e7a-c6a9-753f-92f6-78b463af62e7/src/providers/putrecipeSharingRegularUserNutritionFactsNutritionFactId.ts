import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingNutritionFact } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingNutritionFact";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Update a nutrition fact by its ID.
 *
 * This operation updates nutritional values such as calories, protein,
 * carbohydrates, fat, fiber, sodium, sugar, and optional vitamins and minerals.
 * It requires the nutritionFactId path parameter and a valid update payload.
 * Only authorized regular users can perform this update.
 *
 * @param props - Object containing the authenticated user, nutritionFactId, and
 *   update body
 * @param props.regularUser - The authenticated regular user making the request
 * @param props.nutritionFactId - UUID of the nutrition fact to update
 * @param props.body - Update data including nutritional values
 * @returns The updated nutrition fact record
 * @throws {Error} When the nutrition fact with the specified ID does not exist
 */
export async function putrecipeSharingRegularUserNutritionFactsNutritionFactId(props: {
  regularUser: RegularuserPayload;
  nutritionFactId: string & tags.Format<"uuid">;
  body: IRecipeSharingNutritionFact.IUpdate;
}): Promise<IRecipeSharingNutritionFact> {
  const { regularUser, nutritionFactId, body } = props;

  const existing =
    await MyGlobal.prisma.recipe_sharing_nutrition_facts.findUnique({
      where: { id: nutritionFactId },
    });

  if (!existing) {
    throw new Error("Nutrition fact not found.");
  }

  const updated = await MyGlobal.prisma.recipe_sharing_nutrition_facts.update({
    where: { id: nutritionFactId },
    data: {
      calories: body.calories,
      protein: body.protein,
      carbohydrates: body.carbohydrates,
      fat: body.fat,
      fiber: body.fiber,
      sodium: body.sodium,
      sugar: body.sugar,
      vitamin_a: body.vitamin_a ?? undefined,
      vitamin_c: body.vitamin_c ?? undefined,
      vitamin_d: body.vitamin_d ?? undefined,
      iron: body.iron ?? undefined,
      calcium: body.calcium ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    ingredient_id: updated.ingredient_id,
    calories: updated.calories,
    protein: updated.protein,
    carbohydrates: updated.carbohydrates,
    fat: updated.fat,
    fiber: updated.fiber,
    sodium: updated.sodium,
    sugar: updated.sugar,
    vitamin_a: updated.vitamin_a ?? null,
    vitamin_c: updated.vitamin_c ?? null,
    vitamin_d: updated.vitamin_d ?? null,
    iron: updated.iron ?? null,
    calcium: updated.calcium ?? null,
  };
}
