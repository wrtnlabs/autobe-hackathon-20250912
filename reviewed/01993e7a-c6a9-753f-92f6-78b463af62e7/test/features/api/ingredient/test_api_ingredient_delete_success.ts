import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingIngredient } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingIngredient";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * Test successful deletion of an ingredient by a regular user.
 *
 * This test performs the entire workflow:
 *
 * 1. Registers a new regular user (join).
 * 2. Logs in the user (login) to authenticate.
 * 3. Creates a new ingredient.
 * 4. Deletes the created ingredient by ID.
 * 5. Verifies deletion completes without errors.
 *
 * This ensures that authorized regular users can hard delete ingredients,
 * and that the API behaves as expected with correct status and no response
 * body.
 */
export async function test_api_ingredient_delete_success(
  connection: api.IConnection,
) {
  // 1. Create a new regular user account
  const userCreateBody = {
    email: `test${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const user: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userCreateBody,
    });
  typia.assert(user);

  // 2. Login with the same user credentials
  const userLoginBody = {
    email: userCreateBody.email,
    password_hash: userCreateBody.password_hash,
  } satisfies IRecipeSharingRegularUser.ILogin;

  const loggedInUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: userLoginBody,
    });
  typia.assert(loggedInUser);

  // 3. Create a new ingredient
  const ingredientCreateBody = {
    name: `Ingredient ${RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 8 })}`,
    brand: null,
  } satisfies IRecipeSharingIngredient.ICreate;

  const createdIngredient: IRecipeSharingIngredient =
    await api.functional.recipeSharing.regularUser.ingredients.create(
      connection,
      {
        body: ingredientCreateBody,
      },
    );
  typia.assert(createdIngredient);

  // 4. Delete the created ingredient by ID
  await TestValidator.predicate(
    "deletion succeeds without errors",
    async () => {
      await api.functional.recipeSharing.regularUser.ingredients.eraseIngredient(
        connection,
        {
          ingredientId: createdIngredient.id,
        },
      );
      return true;
    },
  );

  // Note: The specification expects no response on deletion (HTTP 204 No Content).
  // This test does not directly attempt to retrieve the ingredient post-deletion,
  // assuming the implementation hard deletes as per the documentation.
  // If a retrieval API existed, it would be called here with expected error or empty response.
}
