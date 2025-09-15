import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRecipes } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipes";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * This test validates the complete workflow of a regular user deleting
 * their own recipe.
 *
 * It performs the following steps:
 *
 * 1. Register a new regular user with unique email, username, and password
 *    hash.
 * 2. Login the newly created user to establish an authenticated session.
 * 3. Create a recipe resource under the authenticated user.
 * 4. Verify that the recipe is indeed owned by the authenticated user.
 * 5. Delete the created recipe by its ID.
 *
 * This test ensures correct authorization, ownership validation, and
 * resource deletion. All data respects schema constraints including UUID
 * formats and ISO 8601 timestamps. Authentication tokens are managed
 * automatically by the SDK.
 *
 * All API responses are validated for exact type compliance.
 */
export async function test_api_recipe_sharing_regularuser_recipe_erase_success(
  connection: api.IConnection,
) {
  // 1. Create a new regular user
  const userBody = {
    email: `user_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(24),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;
  const createdUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userBody,
    });
  typia.assert(createdUser);

  // 2. Login with the created user
  const loginBody = {
    email: createdUser.email,
    password_hash: userBody.password_hash,
  } satisfies IRecipeSharingRegularUser.ILogin;
  const loggedInUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInUser);

  // 3. Create a recipe owned by the user
  const recipeBody = {
    created_by_id: loggedInUser.id,
    title: `Recipe Title ${RandomGenerator.alphabets(10)}`,
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 7,
    }),
    status: "published",
  } satisfies IRecipeSharingRecipes.ICreate;
  const createdRecipe: IRecipeSharingRecipes =
    await api.functional.recipeSharing.regularUser.recipes.create(connection, {
      body: recipeBody,
    });
  typia.assert(createdRecipe);

  // 4. Validate the recipe is owned by the authenticated user
  TestValidator.equals(
    "recipe owned by user",
    createdRecipe.created_by_id,
    loggedInUser.id,
  );

  // 5. Delete the recipe by ID
  await api.functional.recipeSharing.regularUser.recipes.erase(connection, {
    recipeId: createdRecipe.id,
  });
}
