import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingPersonalizedFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPersonalizedFeed";
import type { IRecipeSharingRecipes } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipes";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * Test updating a personalized feed entry successfully.
 *
 * This E2E test fully exercises the workflow of creating a regular user
 * account, logging in, creating two recipes by two users, creating a
 * personalized feed entry, then updating the personalized feed entry with
 * the new recipe and originator user.
 *
 * It validates authentication handling, resource creation dependencies,
 * update operation, and asserts data consistency for the personalized feed
 * update.
 *
 * All operations use valid request bodies and expected response types,
 * maintaining strict type safety with typia.assert.
 *
 * The updates ensures the personalized feed API correctly processes updates
 * within the typical user scenario.
 *
 * Steps:
 *
 * 1. Create first user, login
 * 2. Create recipe with first user
 * 3. Create personalized feed entry with that recipe and user
 * 4. Create second user, login
 * 5. Create recipe with second user
 * 6. Update personalized feed to point to second user's recipe and originator
 * 7. Assert that update response matches expected changes
 */
export async function test_api_personalized_feed_update_success(
  connection: api.IConnection,
) {
  // 1. Create first regular user by /auth/regularUser/join
  const user1Body = {
    email: `user1_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(64),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;
  const user1 = await api.functional.auth.regularUser.join(connection, {
    body: user1Body,
  });
  typia.assert(user1);

  // 2. Login first regular user to establish auth context
  const loginBody1 = {
    email: user1Body.email,
    password_hash: user1Body.password_hash,
  } satisfies IRecipeSharingRegularUser.ILogin;
  const login1 = await api.functional.auth.regularUser.login(connection, {
    body: loginBody1,
  });
  typia.assert(login1);

  // 3. Create a recipe with user1 as created_by_id
  const recipeCreateBody = {
    created_by_id: user1.id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "published",
  } satisfies IRecipeSharingRecipes.ICreate;
  const recipe = await api.functional.recipeSharing.regularUser.recipes.create(
    connection,
    { body: recipeCreateBody },
  );
  typia.assert(recipe);

  // 4. Create a personalized feed entry with user1 and the created recipe
  const feedCreateBody = {
    user_id: user1.id,
    recipe_id: recipe.id,
    originator_user_id: user1.id,
  } satisfies IRecipeSharingPersonalizedFeed.ICreate;
  const feed =
    await api.functional.recipeSharing.regularUser.personalizedFeeds.create(
      connection,
      { body: feedCreateBody },
    );
  typia.assert(feed);

  // --- Now create a second regular user to swap in updated personalized feed ---
  const user2Body = {
    email: `user2_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(64),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;
  const user2 = await api.functional.auth.regularUser.join(connection, {
    body: user2Body,
  });
  typia.assert(user2);

  // Login user2 to establish auth context for update
  const loginBody2 = {
    email: user2Body.email,
    password_hash: user2Body.password_hash,
  } satisfies IRecipeSharingRegularUser.ILogin;
  const login2 = await api.functional.auth.regularUser.login(connection, {
    body: loginBody2,
  });
  typia.assert(login2);

  // 5. Create another recipe by user2 for update
  const recipeUpdateBody = {
    created_by_id: user2.id,
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 5, wordMax: 9 }),
    description: RandomGenerator.content({ paragraphs: 3 }),
    status: "draft",
  } satisfies IRecipeSharingRecipes.ICreate;
  const recipe2 = await api.functional.recipeSharing.regularUser.recipes.create(
    connection,
    { body: recipeUpdateBody },
  );
  typia.assert(recipe2);

  // 6. Update the personalized feed entry with new recipe and originator user
  const updateBody = {
    recipe_id: recipe2.id,
    originator_user_id: user2.id,
  } satisfies IRecipeSharingPersonalizedFeed.IUpdate;
  const updatedFeed =
    await api.functional.recipeSharing.regularUser.personalizedFeeds.update(
      connection,
      {
        personalizedFeedId: feed.id,
        body: updateBody,
      },
    );
  typia.assert(updatedFeed);

  // Assertions: Confirm the updated feed has correct ids
  TestValidator.equals("feed id should be unchanged", updatedFeed.id, feed.id);
  TestValidator.equals(
    "feed recipe_id should be updated",
    updatedFeed.recipe_id,
    recipe2.id,
  );
  TestValidator.equals(
    "feed originator_user_id should be updated",
    updatedFeed.originator_user_id,
    user2.id,
  );
  TestValidator.equals(
    "feed user_id should be unchanged",
    updatedFeed.user_id,
    feed.user_id,
  );
}
