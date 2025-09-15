import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingIngredient } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingIngredient";
import type { IRecipeSharingNutritionFact } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingNutritionFact";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * Test fetching detailed information of a nutrition fact by its unique ID.
 *
 * This test performs a complete workflow to validate the retrieval
 * endpoint:
 *
 * 1. Create a new regular user via the join API to establish the user context.
 * 2. Login the created user to get authentication tokens.
 * 3. Create a new ingredient to be referenced in the nutrition fact.
 * 4. Create a nutrition fact linked to the created ingredient.
 * 5. Retrieve the nutrition fact by its ID.
 * 6. Assert that all retrieved fields exactly match the created nutrition
 *    fact, ensuring data integrity and correctness of the GET operation.
 *
 * This test ensures that the nutrition fact GET endpoint correctly returns
 * detailed nutritional data for display or processing in client
 * applications.
 */
export async function test_api_nutrition_fact_get_success(
  connection: api.IConnection,
) {
  // 1. Register a new regular user
  const joinBody = {
    email: RandomGenerator.alphaNumeric(8) + "@test.com",
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;
  const user: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: joinBody,
    });
  typia.assert(user);

  // 2. Login the created user
  const loginBody = {
    email: user.email,
    password_hash: joinBody.password_hash,
  } satisfies IRecipeSharingRegularUser.ILogin;
  const loggedInUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInUser);

  // 3. Create an ingredient
  const ingredientCreateBody = {
    name: RandomGenerator.name(2),
    brand: null,
  } satisfies IRecipeSharingIngredient.ICreate;
  const ingredient: IRecipeSharingIngredient =
    await api.functional.recipeSharing.regularUser.ingredients.create(
      connection,
      {
        body: ingredientCreateBody,
      },
    );
  typia.assert(ingredient);

  // 4. Create a nutrition fact linked to that ingredient
  const nutritionFactCreateBody = {
    ingredient_id: ingredient.id,
    calories: (RandomGenerator.alphaNumeric(1).charCodeAt(0) % 500) + 50, // between 50 and 549
    protein: Number((Math.random() * 100).toFixed(2)),
    carbohydrates: Number((Math.random() * 100).toFixed(2)),
    fat: Number((Math.random() * 100).toFixed(2)),
    fiber: Number((Math.random() * 10).toFixed(2)),
    sodium: Number((Math.random() * 500).toFixed(2)),
    sugar: Number((Math.random() * 50).toFixed(2)),
    // Nullable optional vitamins and minerals may be randomly set or null
    vitamin_a:
      Math.random() < 0.5 ? Number((Math.random() * 1000).toFixed(2)) : null,
    vitamin_c:
      Math.random() < 0.5 ? Number((Math.random() * 1000).toFixed(2)) : null,
    vitamin_d:
      Math.random() < 0.5 ? Number((Math.random() * 1000).toFixed(2)) : null,
    iron:
      Math.random() < 0.5 ? Number((Math.random() * 1000).toFixed(2)) : null,
    calcium:
      Math.random() < 0.5 ? Number((Math.random() * 1000).toFixed(2)) : null,
  } satisfies IRecipeSharingNutritionFact.ICreate;

  const nutritionFact: IRecipeSharingNutritionFact =
    await api.functional.recipeSharing.regularUser.nutritionFacts.create(
      connection,
      {
        body: nutritionFactCreateBody,
      },
    );
  typia.assert(nutritionFact);

  // 5. Retrieve the nutrition fact by ID
  const retrievedNutritionFact: IRecipeSharingNutritionFact =
    await api.functional.recipeSharing.nutritionFacts.at(connection, {
      nutritionFactId: nutritionFact.id satisfies string & tags.Format<"uuid">,
    });
  typia.assert(retrievedNutritionFact);

  // 6. Assert all fields match the created nutrition fact
  TestValidator.equals(
    "nutritionFact.id",
    retrievedNutritionFact.id,
    nutritionFact.id,
  );
  TestValidator.equals(
    "nutritionFact.ingredient_id",
    retrievedNutritionFact.ingredient_id,
    nutritionFact.ingredient_id,
  );
  TestValidator.equals(
    "nutritionFact.calories",
    retrievedNutritionFact.calories,
    nutritionFact.calories,
  );
  TestValidator.equals(
    "nutritionFact.protein",
    retrievedNutritionFact.protein,
    nutritionFact.protein,
  );
  TestValidator.equals(
    "nutritionFact.carbohydrates",
    retrievedNutritionFact.carbohydrates,
    nutritionFact.carbohydrates,
  );
  TestValidator.equals(
    "nutritionFact.fat",
    retrievedNutritionFact.fat,
    nutritionFact.fat,
  );
  TestValidator.equals(
    "nutritionFact.fiber",
    retrievedNutritionFact.fiber,
    nutritionFact.fiber,
  );
  TestValidator.equals(
    "nutritionFact.sodium",
    retrievedNutritionFact.sodium,
    nutritionFact.sodium,
  );
  TestValidator.equals(
    "nutritionFact.sugar",
    retrievedNutritionFact.sugar,
    nutritionFact.sugar,
  );

  // For optional vitamins and minerals, allow null or equal values
  TestValidator.equals(
    "nutritionFact.vitamin_a",
    retrievedNutritionFact.vitamin_a,
    nutritionFact.vitamin_a,
  );
  TestValidator.equals(
    "nutritionFact.vitamin_c",
    retrievedNutritionFact.vitamin_c,
    nutritionFact.vitamin_c,
  );
  TestValidator.equals(
    "nutritionFact.vitamin_d",
    retrievedNutritionFact.vitamin_d,
    nutritionFact.vitamin_d,
  );
  TestValidator.equals(
    "nutritionFact.iron",
    retrievedNutritionFact.iron,
    nutritionFact.iron,
  );
  TestValidator.equals(
    "nutritionFact.calcium",
    retrievedNutritionFact.calcium,
    nutritionFact.calcium,
  );
}
