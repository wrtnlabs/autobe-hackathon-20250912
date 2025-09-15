import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRating";
import type { IRecipeSharingRecipes } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipes";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * Test the creation of user ratings for recipes by regular users.
 *
 * This test covers:
 *
 * 1. Creating a regular user.
 * 2. Creating a recipe by the user.
 * 3. Successfully creating a rating with a valid rating value.
 * 4. Attempting to create a duplicate rating by the same user for the same recipe,
 *    which should fail.
 * 5. Trying to create ratings with invalid values outside the range 1 to 5, which
 *    should fail.
 *
 * The test validates proper authorization, input validation, and business rule
 * enforcement.
 */
export async function test_api_recipe_rating_create_success_and_failures(
  connection: api.IConnection,
) {
  // 1. Regular user creation
  const userCreateBody = {
    email: `${RandomGenerator.alphaNumeric(10)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const user: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userCreateBody,
    });
  typia.assert(user);

  // 2. Create a recipe by the user
  const recipeCreateBody = {
    created_by_id: user.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "draft",
  } satisfies IRecipeSharingRecipes.ICreate;

  const recipe: IRecipeSharingRecipes =
    await api.functional.recipeSharing.regularUser.recipes.create(connection, {
      body: recipeCreateBody,
    });
  typia.assert(recipe);

  // 3. Submit a valid rating
  const validRatingBody = {
    recipe_sharing_user_id: user.id,
    recipe_sharing_recipe_id: recipe.id,
    rating: 4,
  } satisfies IRecipeSharingRating.ICreate;

  const rating: IRecipeSharingRating =
    await api.functional.recipeSharing.regularUser.ratings.create(connection, {
      body: validRatingBody,
    });
  typia.assert(rating);

  TestValidator.equals(
    "rating user id matches",
    rating.recipe_sharing_user_id,
    user.id,
  );
  TestValidator.equals(
    "rating recipe id matches",
    rating.recipe_sharing_recipe_id,
    recipe.id,
  );
  TestValidator.predicate(
    "rating value is between 1 and 5",
    rating.rating >= 1 && rating.rating <= 5,
  );

  // 4. Attempt duplicate rating by same user on same recipe - expect failure
  await TestValidator.error(
    "duplicate rating by same user should fail",
    async () => {
      await api.functional.recipeSharing.regularUser.ratings.create(
        connection,
        {
          body: validRatingBody,
        },
      );
    },
  );

  // 5. Attempt rating below valid range - expect failure
  const invalidRatingLow = {
    recipe_sharing_user_id: user.id,
    recipe_sharing_recipe_id: recipe.id,
    rating: 0,
  } satisfies IRecipeSharingRating.ICreate;

  await TestValidator.error(
    "rating below valid range should fail",
    async () => {
      await api.functional.recipeSharing.regularUser.ratings.create(
        connection,
        {
          body: invalidRatingLow,
        },
      );
    },
  );

  // 6. Attempt rating above valid range - expect failure
  const invalidRatingHigh = {
    recipe_sharing_user_id: user.id,
    recipe_sharing_recipe_id: recipe.id,
    rating: 6,
  } satisfies IRecipeSharingRating.ICreate;

  await TestValidator.error(
    "rating above valid range should fail",
    async () => {
      await api.functional.recipeSharing.regularUser.ratings.create(
        connection,
        {
          body: invalidRatingHigh,
        },
      );
    },
  );
}
