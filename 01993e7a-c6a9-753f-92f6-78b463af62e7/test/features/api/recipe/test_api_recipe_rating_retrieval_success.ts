import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRating";
import type { IRecipeSharingRecipes } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipes";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

export async function test_api_recipe_rating_retrieval_success(
  connection: api.IConnection,
) {
  // Step 1: Create a regular user account using join API
  const userCreateBody = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(),
  } satisfies IRecipeSharingRegularUser.ICreate;
  const user: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userCreateBody,
    });
  typia.assert(user);

  // Step 2: User login with exact credentials
  const userLoginBody = {
    email: userCreateBody.email,
    password_hash: userCreateBody.password_hash,
  } satisfies IRecipeSharingRegularUser.ILogin;
  const loggedInUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: userLoginBody,
    });
  typia.assert(loggedInUser);

  // Step 3: Create a sample recipe associated with the logged in user
  const recipeCreateBody = {
    created_by_id: user.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "published",
  } satisfies IRecipeSharingRecipes.ICreate;
  const createdRecipe: IRecipeSharingRecipes =
    await api.functional.recipeSharing.regularUser.recipes.create(connection, {
      body: recipeCreateBody,
    });
  typia.assert(createdRecipe);

  // Step 4: Create a rating associated with the created user and recipe
  const ratingCreateBody = {
    recipe_sharing_user_id: user.id,
    recipe_sharing_recipe_id: createdRecipe.id,
    rating: 5,
  } satisfies IRecipeSharingRating.ICreate;
  const createdRating: IRecipeSharingRating =
    await api.functional.recipeSharing.regularUser.ratings.create(connection, {
      body: ratingCreateBody,
    });
  typia.assert(createdRating);

  // Step 5: Retrieve the rating details using the rating ID
  const retrievedRating: IRecipeSharingRating =
    await api.functional.recipeSharing.regularUser.ratings.at(connection, {
      id: createdRating.id,
    });
  typia.assert(retrievedRating);

  // Verify that retrieved rating matches the created rating
  TestValidator.equals(
    "retrieved rating ID matches created rating ID",
    retrievedRating.id,
    createdRating.id,
  );
  TestValidator.equals(
    "retrieved rating's user ID matches created user ID",
    retrievedRating.recipe_sharing_user_id,
    user.id,
  );
  TestValidator.equals(
    "retrieved rating's recipe ID matches created recipe ID",
    retrievedRating.recipe_sharing_recipe_id,
    createdRecipe.id,
  );
  TestValidator.equals(
    "retrieved rating value matches created rating value",
    retrievedRating.rating,
    5,
  );
}
