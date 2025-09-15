import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRating";
import type { IRecipeSharingRecipes } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipes";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * Test the creation of a new recipe rating successfully by an authenticated
 * regular user.
 *
 * Step-by-step process:
 *
 * 1. Create a new regular user (join) with valid email, username, and
 *    password_hash.
 * 2. Login as the new regular user to set authentication token in connection.
 * 3. Create a new recipe with the created user's ID as created_by_id,
 *    providing title and status.
 * 4. Create a rating for the new recipe by the regular user, with rating
 *    between 1 and 5.
 * 5. Validate all API responses and verify that the rating matches the
 *    expected recipe and user IDs and that rating is within valid range.
 */
export async function test_api_ratings_create_success(
  connection: api.IConnection,
) {
  // 1. Create regular user
  const email: string = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const username: string = RandomGenerator.name(2);
  const password_hash: string = RandomGenerator.alphaNumeric(16);

  const user: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        email,
        username,
        password_hash,
      } satisfies IRecipeSharingRegularUser.ICreate,
    });
  typia.assert(user);

  // 2. Login as the created user to set auth token
  const loginUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: {
        email,
        password_hash,
      } satisfies IRecipeSharingRegularUser.ILogin,
    });
  typia.assert(loginUser);

  // Validate that login user matches created user
  TestValidator.equals(
    "login user ID matches created user",
    loginUser.id,
    user.id,
  );

  // 3. Create a recipe by the user
  const title = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 7,
  });
  const status = "published"; // Valid status assuming typical workflow

  const recipe: IRecipeSharingRecipes =
    await api.functional.recipeSharing.regularUser.recipes.create(connection, {
      body: {
        created_by_id: user.id,
        title,
        description: null,
        status,
      } satisfies IRecipeSharingRecipes.ICreate,
    });
  typia.assert(recipe);

  TestValidator.equals(
    "recipe owner ID matches user ID",
    recipe.created_by_id,
    user.id,
  );
  TestValidator.equals("recipe title matches input", recipe.title, title);
  TestValidator.equals("recipe status matches input", recipe.status, status);

  // 4. Create a rating for the recipe by the user
  const ratingValue = RandomGenerator.pick([1, 2, 3, 4, 5] as const);

  const rating: IRecipeSharingRating =
    await api.functional.recipeSharing.regularUser.ratings.create(connection, {
      body: {
        recipe_sharing_user_id: user.id,
        recipe_sharing_recipe_id: recipe.id,
        rating: ratingValue,
      } satisfies IRecipeSharingRating.ICreate,
    });
  typia.assert(rating);

  // Validate rating matches expected user and recipe IDs
  TestValidator.equals(
    "rating user ID matches created user",
    rating.recipe_sharing_user_id,
    user.id,
  );
  TestValidator.equals(
    "rating recipe ID matches created recipe",
    rating.recipe_sharing_recipe_id,
    recipe.id,
  );
  TestValidator.predicate(
    "rating is between 1 and 5",
    rating.rating >= 1 && rating.rating <= 5,
  );
}
