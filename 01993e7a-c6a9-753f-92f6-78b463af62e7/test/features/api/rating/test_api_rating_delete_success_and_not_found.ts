import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRating";
import type { IRecipeSharingRecipes } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipes";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * E2E test that verifies the successful registration, login, recipe
 * creation, rating creation, and deletion of a rating by a regular user.
 *
 * This test also validates error handling when attempting to delete a
 * rating with a non-existent ID.
 *
 * Steps:
 *
 * 1. Register a regular user with realistic data.
 * 2. Login as the registered user to authenticate.
 * 3. Create a recipe using the authenticated user.
 * 4. Create a rating for that recipe by the user.
 * 5. Delete the rating by its ID, verifying success.
 * 6. Attempt deletion with a non-existent ID, expecting error.
 */
export async function test_api_rating_delete_success_and_not_found(
  connection: api.IConnection,
) {
  // Step 1: Register a regular user
  const email = `user${RandomGenerator.alphaNumeric(6)}@example.com`;
  const passwordHash = RandomGenerator.alphaNumeric(32);
  const username = RandomGenerator.name(2);

  const user: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        email,
        password_hash: passwordHash,
        username,
      } satisfies IRecipeSharingRegularUser.ICreate,
    });
  typia.assert(user);

  // Step 2: Login as the registered user
  const login: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: {
        email,
        password_hash: passwordHash,
      } satisfies IRecipeSharingRegularUser.ILogin,
    });
  typia.assert(login);

  // Step 3: Create a recipe
  const recipeCreateBody = {
    created_by_id: user.id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "published",
  } satisfies IRecipeSharingRecipes.ICreate;

  const recipe: IRecipeSharingRecipes =
    await api.functional.recipeSharing.regularUser.recipes.create(connection, {
      body: recipeCreateBody,
    });
  typia.assert(recipe);

  // Step 4: Create a rating for the recipe by the user
  const ratingCreateBody = {
    recipe_sharing_user_id: user.id,
    recipe_sharing_recipe_id: recipe.id,
    rating: RandomGenerator.pick([1, 2, 3, 4, 5] as const),
  } satisfies IRecipeSharingRating.ICreate;

  const rating: IRecipeSharingRating =
    await api.functional.recipeSharing.regularUser.ratings.create(connection, {
      body: ratingCreateBody,
    });
  typia.assert(rating);

  // Step 5: Delete the created rating
  await api.functional.recipeSharing.regularUser.ratings.erase(connection, {
    id: rating.id,
  });

  // Step 6: Attempt to delete a rating with a non-existing ID, expect error
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    `Deleting non-existent rating should fail: ${nonExistentId}`,
    async () => {
      await api.functional.recipeSharing.regularUser.ratings.erase(connection, {
        id: nonExistentId,
      });
    },
  );
}
