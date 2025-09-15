import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingNutritionFact } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingNutritionFact";

/**
 * Retrieve detailed nutritional information for a specific nutrition fact
 * entry.
 *
 * This endpoint fetches the nutrition fact record by its unique ID from the
 * database.
 *
 * No authentication is required to access this public endpoint.
 *
 * @param props - Object containing the nutritionFactId path parameter
 * @param props.nutritionFactId - Unique identifier of the nutrition fact
 * @returns Detailed nutrition fact data for the specified ID
 * @throws {Error} Throws if the nutrition fact with the given ID is not found
 */
export async function getrecipeSharingNutritionFactsNutritionFactId(props: {
  nutritionFactId: string & tags.Format<"uuid">;
}): Promise<IRecipeSharingNutritionFact> {
  const { nutritionFactId } = props;

  const nutritionFact =
    await MyGlobal.prisma.recipe_sharing_nutrition_facts.findUniqueOrThrow({
      where: { id: nutritionFactId },
    });

  return {
    id: nutritionFact.id,
    ingredient_id: nutritionFact.ingredient_id,
    calories: nutritionFact.calories,
    protein: nutritionFact.protein,
    carbohydrates: nutritionFact.carbohydrates,
    fat: nutritionFact.fat,
    fiber: nutritionFact.fiber,
    sodium: nutritionFact.sodium,
    sugar: nutritionFact.sugar,
    vitamin_a: nutritionFact.vitamin_a ?? null,
    vitamin_c: nutritionFact.vitamin_c ?? null,
    vitamin_d: nutritionFact.vitamin_d ?? null,
    iron: nutritionFact.iron ?? null,
    calcium: nutritionFact.calcium ?? null,
  };
}
