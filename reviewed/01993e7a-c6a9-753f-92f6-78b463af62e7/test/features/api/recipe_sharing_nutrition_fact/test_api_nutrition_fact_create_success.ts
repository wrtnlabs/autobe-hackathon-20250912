import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingIngredient } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingIngredient";
import type { IRecipeSharingNutritionFact } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingNutritionFact";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * Test creating a new nutrition fact by an authenticated regular user.
 *
 * This test follows the full workflow:
 *
 * 1. Register a new regular user
 * 2. Login to authenticate this user (sets token in connection)
 * 3. Create an ingredient to link with nutrition fact
 * 4. Create a nutrition fact with detailed nutrient info linked to the
 *    ingredient
 * 5. Validate that all fields in the returned nutrition fact match the input
 *
 * Ensures that fields such as calories, protein, carbohydrates, fat, fiber,
 * sodium, sugar, and optional vitamins and minerals are properly handled.
 * Uses random realistic data generation where applicable.
 */
export async function test_api_nutrition_fact_create_success(
  connection: api.IConnection,
) {
  // 1. Register a new regular user
  const userCreateBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;
  const userAuthorized: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userCreateBody,
    });
  typia.assert(userAuthorized);

  // 2. Login to authenticate this user
  const userLoginBody = {
    email: userCreateBody.email,
    password_hash: userCreateBody.password_hash,
  } satisfies IRecipeSharingRegularUser.ILogin;
  const userLoggedIn: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: userLoginBody,
    });
  typia.assert(userLoggedIn);

  // 3. Create a new ingredient
  const ingredientCreateBody = {
    name: RandomGenerator.name(1),
    brand: Math.random() < 0.5 ? RandomGenerator.name(1) : null,
  } satisfies IRecipeSharingIngredient.ICreate;
  const ingredient: IRecipeSharingIngredient =
    await api.functional.recipeSharing.regularUser.ingredients.create(
      connection,
      {
        body: ingredientCreateBody,
      },
    );
  typia.assert(ingredient);

  // 4. Create a nutrition fact linked to the ingredient
  // Generate nutrition values within realistic ranges
  const nutritionFactCreateBody = {
    ingredient_id: ingredient.id,
    calories: Math.floor(Math.random() * 500) + 50, // 50 to 550 kcal
    protein: Math.random() * 50, // 0 to 50 grams
    carbohydrates: Math.random() * 100, // 0 to 100 grams
    fat: Math.random() * 50, // 0 to 50 grams
    fiber: Math.random() * 30, // 0 to 30 grams
    sodium: Math.random() * 2000, // 0 to 2000 mg
    sugar: Math.random() * 50, // 0 to 50 grams
    vitamin_a: Math.random() < 0.5 ? Math.random() * 1000 : null, // Optional micrograms
    vitamin_c: Math.random() < 0.5 ? Math.random() * 200 : null, // Optional mg
    vitamin_d: Math.random() < 0.5 ? Math.random() * 20 : null, // Optional micrograms
    iron: Math.random() < 0.5 ? Math.random() * 30 : null, // Optional mg
    calcium: Math.random() < 0.5 ? Math.random() * 1000 : null, // Optional mg
  } satisfies IRecipeSharingNutritionFact.ICreate;

  const nutritionFact: IRecipeSharingNutritionFact =
    await api.functional.recipeSharing.regularUser.nutritionFacts.create(
      connection,
      {
        body: nutritionFactCreateBody,
      },
    );
  typia.assert(nutritionFact);

  // 5. Validate that returned nutrition fact data matches input
  TestValidator.equals(
    "ingredient_id matches",
    nutritionFact.ingredient_id,
    nutritionFactCreateBody.ingredient_id,
  );

  TestValidator.equals(
    "calories match",
    nutritionFact.calories,
    nutritionFactCreateBody.calories,
  );

  TestValidator.equals(
    "protein match",
    nutritionFact.protein,
    nutritionFactCreateBody.protein,
  );

  TestValidator.equals(
    "carbohydrates match",
    nutritionFact.carbohydrates,
    nutritionFactCreateBody.carbohydrates,
  );

  TestValidator.equals(
    "fat match",
    nutritionFact.fat,
    nutritionFactCreateBody.fat,
  );

  TestValidator.equals(
    "fiber match",
    nutritionFact.fiber,
    nutritionFactCreateBody.fiber,
  );

  TestValidator.equals(
    "sodium match",
    nutritionFact.sodium,
    nutritionFactCreateBody.sodium,
  );

  TestValidator.equals(
    "sugar match",
    nutritionFact.sugar,
    nutritionFactCreateBody.sugar,
  );

  TestValidator.equals(
    "vitamin_a match",
    nutritionFact.vitamin_a,
    nutritionFactCreateBody.vitamin_a,
  );

  TestValidator.equals(
    "vitamin_c match",
    nutritionFact.vitamin_c,
    nutritionFactCreateBody.vitamin_c,
  );

  TestValidator.equals(
    "vitamin_d match",
    nutritionFact.vitamin_d,
    nutritionFactCreateBody.vitamin_d,
  );

  TestValidator.equals(
    "iron match",
    nutritionFact.iron,
    nutritionFactCreateBody.iron,
  );

  TestValidator.equals(
    "calcium match",
    nutritionFact.calcium,
    nutritionFactCreateBody.calcium,
  );
}
