import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingPersonalizedFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPersonalizedFeed";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * Validate the successful retrieval of a personalized feed entry by its ID
 * for an authenticated regular user.
 *
 * This test performs the full workflow:
 *
 * 1. Register a new regular user and authenticate.
 * 2. Create a personalized feed entry linked to the created user.
 * 3. Retrieve the personalized feed entry by its ID.
 * 4. Verify all returned fields exist and have valid format (UUID and ISO
 *    date-time).
 *
 * It ensures that only authenticated regular users can access their
 * personalized feeds and that the data integrity is maintained.
 */
export async function test_api_personalized_feed_retrieval_success(
  connection: api.IConnection,
) {
  // Step 1. Register a regular user via join API
  const userBody = {
    email: `${RandomGenerator.alphaNumeric(10)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(20),
    username: RandomGenerator.name(),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const regularUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userBody,
    });
  typia.assert(regularUser);

  // Step 2. Create a personalized feed entry linked to the authenticated regular user
  const feedCreateBody = {
    user_id: regularUser.id,
    recipe_id: typia.random<string & tags.Format<"uuid">>(),
    originator_user_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IRecipeSharingPersonalizedFeed.ICreate;

  const createdFeed: IRecipeSharingPersonalizedFeed =
    await api.functional.recipeSharing.regularUser.personalizedFeeds.create(
      connection,
      {
        body: feedCreateBody,
      },
    );
  typia.assert(createdFeed);

  // Step 3. Retrieve the personalized feed entry by its ID
  const retrievedFeed: IRecipeSharingPersonalizedFeed =
    await api.functional.recipeSharing.regularUser.personalizedFeeds.at(
      connection,
      {
        personalizedFeedId: createdFeed.id,
      },
    );
  typia.assert(retrievedFeed);

  // Step 4. Verify that the retrieved feed matches the created feed and fields have valid formats
  TestValidator.equals(
    "retrieved feed id matches created feed id",
    retrievedFeed.id,
    createdFeed.id,
  );

  TestValidator.equals(
    "retrieved feed user_id matches created user id",
    retrievedFeed.user_id,
    regularUser.id,
  );

  TestValidator.equals(
    "retrieved feed recipe_id matches created recipe id",
    retrievedFeed.recipe_id,
    createdFeed.recipe_id,
  );

  TestValidator.equals(
    "retrieved feed originator_user_id matches created originator user id",
    retrievedFeed.originator_user_id,
    createdFeed.originator_user_id,
  );

  // Validate created_at and updated_at are valid ISO 8601 date-time strings
  TestValidator.predicate(
    "created_at is valid ISO date-time",
    typeof retrievedFeed.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
        retrievedFeed.created_at,
      ),
  );

  TestValidator.predicate(
    "updated_at is valid ISO date-time",
    typeof retrievedFeed.updated_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
        retrievedFeed.updated_at,
      ),
  );
}
