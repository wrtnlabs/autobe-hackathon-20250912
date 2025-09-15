import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingIngredient } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingIngredient";
import type { IRecipeSharingNutritionFact } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingNutritionFact";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * Test updating an existing nutrition fact with valid updated nutrition
 * properties.
 *
 * This test covers the complete workflow:
 *
 * 1. Creating a regular user and logging in to establish authentication
 *    context.
 * 2. Creating an ingredient entity as a prerequisite.
 * 3. Creating a nutrition fact linked to the ingredient with realistic
 *    nutrition values.
 * 4. Updating the nutrition fact by ID with new nutrition data.
 * 5. Verifying that the updated nutrition fact contains the new values,
 *    reflecting the changes.
 *
 * This validates data consistency, referential integrity, and correct
 * operation of the update endpoint.
 */
export async function test_api_nutrition_fact_update_success(
  connection: api.IConnection,
) {
  // 1. Regular user creation with realistic random data
  const creationBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(),
    password_hash: RandomGenerator.alphaNumeric(64),
  } satisfies IRecipeSharingRegularUser.ICreate;
  const user: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: creationBody,
    });
  typia.assert(user);

  // 2. Login to authenticate the user
  const loginBody = {
    email: creationBody.email,
    password_hash: creationBody.password_hash,
  } satisfies IRecipeSharingRegularUser.ILogin;
  const loggedInUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInUser);

  // 3. Create an ingredient as a prerequisite
  const ingredientBody = {
    name: RandomGenerator.name(),
    brand: null,
  } satisfies IRecipeSharingIngredient.ICreate;
  const ingredient: IRecipeSharingIngredient =
    await api.functional.recipeSharing.regularUser.ingredients.create(
      connection,
      { body: ingredientBody },
    );
  typia.assert(ingredient);

  // 4. Create a nutrition fact linked to the ingredient with explicit numeric values
  const nutritionFactCreateBody = {
    ingredient_id: ingredient.id,
    calories: 150 + Math.floor(Math.random() * 100),
    protein: 5 + Math.floor(Math.random() * 15),
    carbohydrates: 10 + Math.floor(Math.random() * 20),
    fat: 2 + Math.floor(Math.random() * 10),
    fiber: 1 + Math.floor(Math.random() * 5),
    sodium: 50 + Math.floor(Math.random() * 100),
    sugar: Math.floor(Math.random() * 10),
    vitamin_a: 400 + Math.floor(Math.random() * 300),
    vitamin_c: null,
    vitamin_d: 10 + Math.floor(Math.random() * 20),
    iron: 2 + Math.floor(Math.random() * 4),
    calcium: null,
  } satisfies IRecipeSharingNutritionFact.ICreate;
  const nutritionFact: IRecipeSharingNutritionFact =
    await api.functional.recipeSharing.regularUser.nutritionFacts.create(
      connection,
      { body: nutritionFactCreateBody },
    );
  typia.assert(nutritionFact);

  // 5. Update the nutrition fact with new nutrition values
  const nutritionFactUpdateBody = {
    calories: nutritionFact.calories + 10,
    protein: nutritionFact.protein + 1,
    carbohydrates: nutritionFact.carbohydrates + 5,
    fat: nutritionFact.fat + 2,
    fiber: nutritionFact.fiber + 1,
    sodium: nutritionFact.sodium + 20,
    sugar: nutritionFact.sugar + 3,
    vitamin_a: 600,
    vitamin_c: 50,
    vitamin_d: null,
    iron: 3,
    calcium: 100,
  } satisfies IRecipeSharingNutritionFact.IUpdate;
  const updatedNutritionFact: IRecipeSharingNutritionFact =
    await api.functional.recipeSharing.regularUser.nutritionFacts.update(
      connection,
      {
        nutritionFactId: nutritionFact.id,
        body: nutritionFactUpdateBody,
      },
    );
  typia.assert(updatedNutritionFact);

  // 6. Validate that updated fields match the update request
  TestValidator.equals(
    "nutrition fact calories updated",
    updatedNutritionFact.calories,
    nutritionFactUpdateBody.calories,
  );
  TestValidator.equals(
    "nutrition fact protein updated",
    updatedNutritionFact.protein,
    nutritionFactUpdateBody.protein,
  );
  TestValidator.equals(
    "nutrition fact carbohydrates updated",
    updatedNutritionFact.carbohydrates,
    nutritionFactUpdateBody.carbohydrates,
  );
  TestValidator.equals(
    "nutrition fact fat updated",
    updatedNutritionFact.fat,
    nutritionFactUpdateBody.fat,
  );
  TestValidator.equals(
    "nutrition fact fiber updated",
    updatedNutritionFact.fiber,
    nutritionFactUpdateBody.fiber,
  );
  TestValidator.equals(
    "nutrition fact sodium updated",
    updatedNutritionFact.sodium,
    nutritionFactUpdateBody.sodium,
  );
  TestValidator.equals(
    "nutrition fact sugar updated",
    updatedNutritionFact.sugar,
    nutritionFactUpdateBody.sugar,
  );
  TestValidator.equals(
    "nutrition fact vitamin_a updated",
    updatedNutritionFact.vitamin_a,
    nutritionFactUpdateBody.vitamin_a,
  );
  TestValidator.equals(
    "nutrition fact vitamin_c updated",
    updatedNutritionFact.vitamin_c,
    nutritionFactUpdateBody.vitamin_c,
  );
  TestValidator.equals(
    "nutrition fact vitamin_d updated",
    updatedNutritionFact.vitamin_d,
    nutritionFactUpdateBody.vitamin_d,
  );
  TestValidator.equals(
    "nutrition fact iron updated",
    updatedNutritionFact.iron,
    nutritionFactUpdateBody.iron,
  );
  TestValidator.equals(
    "nutrition fact calcium updated",
    updatedNutritionFact.calcium,
    nutritionFactUpdateBody.calcium,
  );
}
