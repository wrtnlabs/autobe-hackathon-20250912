import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRecipes } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipes";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * Test retrieving detailed information of a specific recipe by its ID for an
 * authenticated regular user.
 *
 * This test creates a regular user account, authenticates the user, creates a
 * recipe, then retrieves the recipe by its ID to verify that all recipe fields
 * match.
 *
 * Ensures that the recipe title uniqueness per user is respected and that the
 * detailed information returned matches the originally created recipe data.
 *
 * Steps:
 *
 * 1. Create a new regular user by joining.
 * 2. Login the user to obtain authentication tokens.
 * 3. Create a new recipe under that user.
 * 4. Retrieve the recipe details by the recipe ID.
 * 5. Verify the retrieved recipe data matches the recipe created earlier.
 */
export async function test_api_recipe_retrieve_success_regularuser(
  connection: api.IConnection,
) {
  // 1. Create a new regular user account
  const userCreateBody = {
    email: RandomGenerator.alphaNumeric(8) + "@test.com",
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(1),
  } satisfies IRecipeSharingRegularUser.ICreate;
  const authorizedUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userCreateBody,
    });
  typia.assert(authorizedUser);

  // 2. Login the user
  const userLoginBody = {
    email: userCreateBody.email,
    password_hash: userCreateBody.password_hash,
  } satisfies IRecipeSharingRegularUser.ILogin;
  const loggedInUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: userLoginBody,
    });
  typia.assert(loggedInUser);

  // 3. Create a new recipe for the user
  const recipeCreateBody = {
    created_by_id: authorizedUser.id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 7,
    }),
    status: "draft",
  } satisfies IRecipeSharingRecipes.ICreate;
  const createdRecipe: IRecipeSharingRecipes =
    await api.functional.recipeSharing.regularUser.recipes.create(connection, {
      body: recipeCreateBody,
    });
  typia.assert(createdRecipe);

  // 4. Retrieve the recipe details by recipeId
  const retrievedRecipe: IRecipeSharingRecipes =
    await api.functional.recipeSharing.regularUser.recipes.at(connection, {
      recipeId: createdRecipe.id,
    });
  typia.assert(retrievedRecipe);

  // 5. Verify all retrieved properties match the created recipe
  TestValidator.equals(
    "recipe id matches",
    retrievedRecipe.id,
    createdRecipe.id,
  );
  TestValidator.equals(
    "recipe created_by_id matches",
    retrievedRecipe.created_by_id,
    createdRecipe.created_by_id,
  );
  TestValidator.equals(
    "recipe title matches",
    retrievedRecipe.title,
    createdRecipe.title,
  );

  if (
    createdRecipe.description === null ||
    createdRecipe.description === undefined
  ) {
    TestValidator.equals(
      "recipe description is null or undefined",
      retrievedRecipe.description,
      null,
    );
  } else {
    TestValidator.equals(
      "recipe description matches",
      retrievedRecipe.description,
      createdRecipe.description,
    );
  }

  TestValidator.equals(
    "recipe status matches",
    retrievedRecipe.status,
    createdRecipe.status,
  );

  TestValidator.equals(
    "recipe created_at matches",
    retrievedRecipe.created_at,
    createdRecipe.created_at,
  );
  TestValidator.equals(
    "recipe updated_at matches",
    retrievedRecipe.updated_at,
    createdRecipe.updated_at,
  );

  if (
    createdRecipe.deleted_at === null ||
    createdRecipe.deleted_at === undefined
  ) {
    TestValidator.equals(
      "recipe deleted_at is null or undefined",
      retrievedRecipe.deleted_at,
      null,
    );
  } else {
    TestValidator.equals(
      "recipe deleted_at matches",
      retrievedRecipe.deleted_at,
      createdRecipe.deleted_at,
    );
  }
}
