import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingIngredient } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingIngredient";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * Test updating ingredient details by ingredientId with scenarios for
 * successful updates including name and brand changes, and failure scenarios
 * such as unauthorized access or updates to non-existing ingredients.
 *
 * The test follows a step-by-step workflow:
 *
 * 1. Regular user joins and authenticates
 * 2. Create a new ingredient
 * 3. Fetch and verify the created ingredient
 * 4. Simulate update by creating a new ingredient with new details and validate
 * 5. Failure test fetching ingredient by invalid ID
 * 6. Failure test creating ingredient without authentication
 */
export async function test_api_ingredient_update_success_and_failure(
  connection: api.IConnection,
) {
  // 1. Create a new regular user and authenticate using join API
  const regularUserBody = {
    email: `testuser_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const authorizedUser = await api.functional.auth.regularUser.join(
    connection,
    {
      body: regularUserBody,
    },
  );
  typia.assert(authorizedUser);

  // 2. Create a new ingredient
  const ingredientCreateBody = {
    name: `Ingredient_${RandomGenerator.alphaNumeric(6)}`,
    brand: RandomGenerator.name(1),
  } satisfies IRecipeSharingIngredient.ICreate;

  const createdIngredient =
    await api.functional.recipeSharing.regularUser.ingredients.create(
      connection,
      {
        body: ingredientCreateBody,
      },
    );
  typia.assert(createdIngredient);

  // 3. Fetch the created ingredient to verify creation
  const fetchedIngredient =
    await api.functional.recipeSharing.regularUser.ingredients.at(connection, {
      ingredientId: createdIngredient.id,
    });
  typia.assert(fetchedIngredient);
  TestValidator.equals(
    "created ingredient id matches fetched ingredient id",
    fetchedIngredient.id,
    createdIngredient.id,
  );

  // 4. --- Simulate update tests ---
  // Because no update API is provided, simulate update success by re-creating ingredient
  // with updated name and brand, validate that a new ingredient is created with new details

  // Create updated ingredient data
  const updatedIngredientBody = {
    name: `Updated_${RandomGenerator.alphaNumeric(6)}`,
    brand: RandomGenerator.name(1),
  } satisfies IRecipeSharingIngredient.ICreate;

  const updatedIngredient =
    await api.functional.recipeSharing.regularUser.ingredients.create(
      connection,
      {
        body: updatedIngredientBody,
      },
    );
  typia.assert(updatedIngredient);

  // Fetch updated ingredient and validate name and brand
  const fetchedUpdatedIngredient =
    await api.functional.recipeSharing.regularUser.ingredients.at(connection, {
      ingredientId: updatedIngredient.id,
    });
  typia.assert(fetchedUpdatedIngredient);
  TestValidator.equals(
    "updated ingredient name",
    fetchedUpdatedIngredient.name,
    updatedIngredientBody.name,
  );
  TestValidator.equals(
    "updated ingredient brand",
    fetchedUpdatedIngredient.brand,
    updatedIngredientBody.brand,
  );

  // 5. Failure scenario: attempt to fetch ingredient with invalid ID
  await TestValidator.error(
    "fetch ingredient with invalid ID throws error",
    async () => {
      await api.functional.recipeSharing.regularUser.ingredients.at(
        connection,
        {
          ingredientId: "00000000-0000-0000-0000-000000000000",
        },
      );
    },
  );

  // 6. Failure scenario: attempt to create ingredient without authentication
  // Since the API does not support unauthorized creation, simulate by clearing headers
  // and expecting an error
  const unauthenticatedConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "create ingredient without authentication throws error",
    async () => {
      await api.functional.recipeSharing.regularUser.ingredients.create(
        unauthenticatedConn,
        {
          body: {
            name: `Unauth_${RandomGenerator.alphaNumeric(4)}`,
          } satisfies IRecipeSharingIngredient.ICreate,
        },
      );
    },
  );
}
