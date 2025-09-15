import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingIngredient } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingIngredient";
import type { IRecipeSharingNutritionFact } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingNutritionFact";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * Test the full deletion workflow of a nutrition fact by a regular user.
 *
 * This E2E test covers user registration, login, ingredient creation,
 * nutrition fact creation, deletion of the nutrition fact, and verification
 * of the deletion.
 *
 * The test validates successful creation and deletion operations, asserting
 * proper type conformity with typia.assert and using TestValidator to
 * ensure the nutrition fact no longer exists after deletion.
 *
 * Steps:
 *
 * 1. Regular user joins and logs in.
 * 2. Ingredient is created.
 * 3. Nutrition fact associated with the ingredient is created.
 * 4. The created nutrition fact is deleted.
 * 5. Attempt to verify deletion logically since no direct get API exists.
 */
export async function test_api_nutrition_fact_delete_success(
  connection: api.IConnection,
) {
  // Step 1: Regular user joins to create account
  const email = RandomGenerator.alphaNumeric(8) + "@example.com";
  const passwordHash = RandomGenerator.alphaNumeric(32);
  const username = RandomGenerator.alphaNumeric(12);
  const authorizedUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        email: email,
        password_hash: passwordHash,
        username: username,
      },
    });
  typia.assert(authorizedUser);

  // Step 2: Regular user logs in
  const loggedUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: {
        email: email,
        password_hash: passwordHash,
      },
    });
  typia.assert(loggedUser);

  // Step 3: Create an ingredient
  const ingredientCreateBody: IRecipeSharingIngredient.ICreate = {
    name: RandomGenerator.name(),
    brand: null, // explicit null allowed and meaningful as optional
  };

  const ingredient: IRecipeSharingIngredient =
    await api.functional.recipeSharing.regularUser.ingredients.create(
      connection,
      {
        body: ingredientCreateBody,
      },
    );
  typia.assert(ingredient);

  // Step 4: Create a nutrition fact linked to the ingredient
  const nutritionFactCreateBody: IRecipeSharingNutritionFact.ICreate = {
    ingredient_id: ingredient.id, // link to created ingredient
    calories: RandomGenerator.alphaNumeric(3).length * 10 || 100, // realistic calories
    protein: 10, // simple fixed realistic value
    fat: 5, // realistic value
    carbohydrates: 20, // realistic value
    fiber: 2, // realistic value
    sodium: 50, // realistic value
    sugar: 8, // realistic value
    vitamin_a: null, // optional vitamins set to null
    vitamin_c: null,
    vitamin_d: null,
    iron: null,
    calcium: null,
  };

  const nutritionFact: IRecipeSharingNutritionFact =
    await api.functional.recipeSharing.regularUser.nutritionFacts.create(
      connection,
      {
        body: nutritionFactCreateBody,
      },
    );

  typia.assert(nutritionFact);

  // Step 5: Delete the created nutrition fact
  await api.functional.recipeSharing.regularUser.nutritionFacts.erase(
    connection,
    {
      nutritionFactId: nutritionFact.id,
    },
  );

  // Step 6: Since no API exists to get nutrition fact, logical check:
  // We can try to delete again and expect error to confirm deletion
  await TestValidator.error(
    "deleting the same nutrition fact twice should throw an error",
    async () => {
      await api.functional.recipeSharing.regularUser.nutritionFacts.erase(
        connection,
        {
          nutritionFactId: nutritionFact.id,
        },
      );
    },
  );
}
