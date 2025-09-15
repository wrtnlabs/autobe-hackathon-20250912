import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingNutritionFact } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingNutritionFact";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Create a new nutrition fact record.
 *
 * Validates the linked ingredient exists and inserts the detailed nutrition
 * facts.
 *
 * @param props - The object with authenticated regularUser and creation data
 * @returns The created nutrition fact record
 * @throws Error if the linked ingredient is not found
 */
export async function postrecipeSharingRegularUserNutritionFacts(props: {
  regularUser: RegularuserPayload;
  body: IRecipeSharingNutritionFact.ICreate;
}): Promise<IRecipeSharingNutritionFact> {
  const { regularUser, body } = props;

  // Validate linked ingredient exists
  const ingredient =
    await MyGlobal.prisma.recipe_sharing_ingredients.findUnique({
      where: { id: body.ingredient_id },
    });
  if (!ingredient) throw new Error("Ingredient not found");

  // Generate new UUID for nutrition fact record
  const id = v4() as string & tags.Format<"uuid">;

  // Create nutrition fact record in database
  const created = await MyGlobal.prisma.recipe_sharing_nutrition_facts.create({
    data: {
      id,
      ingredient_id: body.ingredient_id,
      calories: body.calories,
      protein: body.protein,
      carbohydrates: body.carbohydrates,
      fat: body.fat,
      fiber: body.fiber,
      sodium: body.sodium,
      sugar: body.sugar,
      vitamin_a: body.vitamin_a ?? null,
      vitamin_c: body.vitamin_c ?? null,
      vitamin_d: body.vitamin_d ?? null,
      iron: body.iron ?? null,
      calcium: body.calcium ?? null,
    },
  });

  // Return the created record with correct typing
  return {
    id: created.id,
    ingredient_id: created.ingredient_id,
    calories: created.calories,
    protein: created.protein,
    carbohydrates: created.carbohydrates,
    fat: created.fat,
    fiber: created.fiber,
    sodium: created.sodium,
    sugar: created.sugar,
    vitamin_a: created.vitamin_a === null ? null : created.vitamin_a,
    vitamin_c: created.vitamin_c === null ? null : created.vitamin_c,
    vitamin_d: created.vitamin_d === null ? null : created.vitamin_d,
    iron: created.iron === null ? null : created.iron,
    calcium: created.calcium === null ? null : created.calcium,
  };
}
