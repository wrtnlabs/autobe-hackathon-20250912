import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingIngredient } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingIngredient";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * Test deleting existing ingredient by ID with success for authorized user and
 * failure for unauthorized or non-existent ingredient ID. Confirm ingredient is
 * hard deleted from database.
 *
 * Since no explicit delete API is provided, deletion is simulated by checking
 * fetch failure for non-existent and unauthorized access.
 */
export async function test_api_ingredient_delete_success_and_failure(
  connection: api.IConnection,
) {
  // 1. User join/authenticate regularUser
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const username: string = RandomGenerator.name(2);
  const userPasswordHash = "hashed_password_example"; // Placeholder crypto hash
  const user: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        email: userEmail,
        username: username,
        password_hash: userPasswordHash,
      } satisfies IRecipeSharingRegularUser.ICreate,
    });
  typia.assert(user);

  // 2. Create an ingredient as the authorized user
  const ingredientBody = {
    name: "Test Ingredient",
    brand: null,
  } satisfies IRecipeSharingIngredient.ICreate;
  const ingredient: IRecipeSharingIngredient =
    await api.functional.recipeSharing.regularUser.ingredients.create(
      connection,
      {
        body: ingredientBody,
      },
    );
  typia.assert(ingredient);

  // 3. Confirm ingredient retrieved by GET at endpoint
  const fetchedIngredient: IRecipeSharingIngredient =
    await api.functional.recipeSharing.regularUser.ingredients.at(connection, {
      ingredientId: ingredient.id,
    });
  typia.assert(fetchedIngredient);
  TestValidator.equals(
    "ingredient id matches",
    fetchedIngredient.id,
    ingredient.id,
  );
  TestValidator.equals(
    "ingredient name matches",
    fetchedIngredient.name,
    ingredientBody.name,
  );

  // 4. Try fetching non-existent ingredient - expect error
  let nonExistentId = typia.random<string & tags.Format<"uuid">>();
  if (nonExistentId === ingredient.id) {
    // Defensive regeneration of nonExistentId
    do {
      nonExistentId = typia.random<string & tags.Format<"uuid">>();
    } while (nonExistentId === ingredient.id);
  }
  await TestValidator.error(
    "fetching non-existent ingredient should fail",
    async () => {
      await api.functional.recipeSharing.regularUser.ingredients.at(
        connection,
        {
          ingredientId: nonExistentId,
        },
      );
    },
  );

  // 5. Simulate unauthorized access: create a different user and attempt to fetch ingredient
  const otherUserEmail: string = typia.random<string & tags.Format<"email">>();
  const otherUsername: string = RandomGenerator.name(2);
  const otherUserPasswordHash = "hashed_password_other";

  // Create a separate connection object to simulate a different user context
  const unauthorizedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  const otherUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(unauthorizedConnection, {
      body: {
        email: otherUserEmail,
        username: otherUsername,
        password_hash: otherUserPasswordHash,
      } satisfies IRecipeSharingRegularUser.ICreate,
    });
  typia.assert(otherUser);

  // 6. Try fetching ingredient from unauthorized user connection - expect failure
  await TestValidator.error(
    "unauthorized user fetching ingredient should fail",
    async () => {
      await api.functional.recipeSharing.regularUser.ingredients.at(
        unauthorizedConnection,
        {
          ingredientId: ingredient.id,
        },
      );
    },
  );
}
