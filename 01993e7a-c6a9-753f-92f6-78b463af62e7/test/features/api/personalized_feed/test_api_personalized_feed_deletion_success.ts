import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingPersonalizedFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPersonalizedFeed";
import type { IRecipeSharingRecipes } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipes";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * Test deleting a personalized feed entry successfully. This test simulates a
 * full user journey: a regular user is created and logged in, a recipe is
 * created by the user, then a personalized feed entry linking the user and
 * recipe is created and finally deleted. Throughout, assertions validate that
 * each operation succeeds and that the personalized feed entry is effectively
 * removed from the system upon deletion.
 */
export async function test_api_personalized_feed_deletion_success(
  connection: api.IConnection,
) {
  // 1. Create a new regular user account
  const userCreateBody = {
    email: `${RandomGenerator.alphaNumeric(8).toLowerCase()}@test.com`,
    username: RandomGenerator.name(2).replace(/ /g, "_"),
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const createdUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userCreateBody,
    });
  typia.assert(createdUser);

  // 2. Log in with the created user credentials
  const loginBody = {
    email: userCreateBody.email,
    password_hash: userCreateBody.password_hash,
  } satisfies IRecipeSharingRegularUser.ILogin;

  const loggedInUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInUser);
  TestValidator.equals(
    "login user id equals created user id",
    loggedInUser.id,
    createdUser.id,
  );
  TestValidator.equals(
    "login user email equals created user email",
    loggedInUser.email,
    createdUser.email,
  );
  TestValidator.equals(
    "login username equals created username",
    loggedInUser.username,
    createdUser.username,
  );

  // 3. Create a recipe associated with the user
  const recipeCreateBody = {
    created_by_id: createdUser.id,
    title: RandomGenerator.paragraph({ sentences: 3 }).slice(0, 50),
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "draft",
  } satisfies IRecipeSharingRecipes.ICreate;

  const createdRecipe: IRecipeSharingRecipes =
    await api.functional.recipeSharing.regularUser.recipes.create(connection, {
      body: recipeCreateBody,
    });
  typia.assert(createdRecipe);
  TestValidator.equals(
    "created recipe user ID matches",
    createdRecipe.created_by_id,
    createdUser.id,
  );
  TestValidator.equals(
    "created recipe title matches",
    createdRecipe.title,
    recipeCreateBody.title,
  );
  TestValidator.equals(
    "created recipe description matches",
    createdRecipe.description,
    recipeCreateBody.description,
  );
  TestValidator.equals(
    "created recipe status matches",
    createdRecipe.status,
    recipeCreateBody.status,
  );

  // 4. Create a personalized feed entry linking the user and recipe
  const personalizedFeedCreateBody = {
    user_id: createdUser.id,
    recipe_id: createdRecipe.id,
    originator_user_id: createdUser.id,
  } satisfies IRecipeSharingPersonalizedFeed.ICreate;

  const createdPersonalizedFeed: IRecipeSharingPersonalizedFeed =
    await api.functional.recipeSharing.regularUser.personalizedFeeds.create(
      connection,
      {
        body: personalizedFeedCreateBody,
      },
    );
  typia.assert(createdPersonalizedFeed);
  TestValidator.equals(
    "personalized feed user ID matches",
    createdPersonalizedFeed.user_id,
    createdUser.id,
  );
  TestValidator.equals(
    "personalized feed recipe ID matches",
    createdPersonalizedFeed.recipe_id,
    createdRecipe.id,
  );
  TestValidator.equals(
    "personalized feed originator user ID matches",
    createdPersonalizedFeed.originator_user_id,
    createdUser.id,
  );

  // 5. Delete the personalized feed entry
  await api.functional.recipeSharing.regularUser.personalizedFeeds.erase(
    connection,
    {
      personalizedFeedId: createdPersonalizedFeed.id,
    },
  );

  // 6. Attempt to delete again to verify it is no longer present (optional negative test)
  // This should cause an error; here we do not assume exact error type because
  // it might be NotFound or Unauthorized, so we test that an error is thrown
  await TestValidator.error(
    "deleting a non-existent personalized feed should fail",
    async () => {
      await api.functional.recipeSharing.regularUser.personalizedFeeds.erase(
        connection,
        {
          personalizedFeedId: createdPersonalizedFeed.id,
        },
      );
    },
  );
}
