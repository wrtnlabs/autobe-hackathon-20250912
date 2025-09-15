import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingPersonalizedFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPersonalizedFeed";
import type { IRecipeSharingRecipes } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipes";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * Validate creating a personalized feed entry for authenticated
 * regularUser.
 *
 * This test completes the business workflow by:
 *
 * 1. Creating and authenticating a regularUser account
 * 2. Creating a recipe associated with that user
 * 3. Creating a personalized feed entry linking the user and recipe
 * 4. Validating the creation response for correctness and data integrity
 */
export async function test_api_personalized_feed_creation_success(
  connection: api.IConnection,
) {
  // 1. Create a regularUser account and authenticate
  const userCreateBody = {
    email: `${RandomGenerator.alphaNumeric(10)}@example.com`,
    username: RandomGenerator.name(2),
    password_hash: RandomGenerator.alphaNumeric(64),
  } satisfies IRecipeSharingRegularUser.ICreate;
  const user: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userCreateBody,
    });
  typia.assert(user);

  // 2. Create a recipe associated with the user
  const recipeCreateBody = {
    created_by_id: user.id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 6, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 6,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 7,
    }),
    status: "draft",
  } satisfies IRecipeSharingRecipes.ICreate;
  const recipe: IRecipeSharingRecipes =
    await api.functional.recipeSharing.regularUser.recipes.create(connection, {
      body: recipeCreateBody,
    });
  typia.assert(recipe);

  // 3. Create a personalized feed entry referencing user and recipe
  const personalizedFeedCreateBody = {
    user_id: user.id,
    recipe_id: recipe.id,
    originator_user_id: user.id,
  } satisfies IRecipeSharingPersonalizedFeed.ICreate;
  const personalizedFeed: IRecipeSharingPersonalizedFeed =
    await api.functional.recipeSharing.regularUser.personalizedFeeds.create(
      connection,
      {
        body: personalizedFeedCreateBody,
      },
    );
  typia.assert(personalizedFeed);

  // 4. Validate the created personalized feed
  TestValidator.equals("user_id matches", personalizedFeed.user_id, user.id);
  TestValidator.equals(
    "recipe_id matches",
    personalizedFeed.recipe_id,
    recipe.id,
  );
  TestValidator.equals(
    "originator_user_id matches",
    personalizedFeed.originator_user_id,
    user.id,
  );
  TestValidator.predicate(
    "id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      personalizedFeed.id,
    ),
  );
  TestValidator.predicate(
    "created_at is valid ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(
      personalizedFeed.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(
      personalizedFeed.updated_at,
    ),
  );
}
