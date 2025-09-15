import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingPersonalizedFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPersonalizedFeed";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * Validate successful retrieval of detailed personalized feed entry for an
 * authenticated premium user.
 *
 * This test emulates a realistic business workflow in a recipe sharing platform
 * where:
 *
 * 1. A premium user account is created and authenticated.
 * 2. A regular user account is created and authenticated.
 * 3. The regular user creates a personalized feed entry referencing a recipe.
 * 4. The premium user logs in and retrieves the personalized feed entry by ID.
 *
 * The test validates that the retrieval returns all expected properties with
 * correct UUID and date-time formats, ensuring access control and data
 * consistency.
 */
export async function test_api_personalized_feed_retrieval_premium_user_success(
  connection: api.IConnection,
) {
  // 1. Create a premium user account and authenticate
  const premiumUserCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingPremiumUser.ICreate;

  const premiumUser: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.join(connection, {
      body: premiumUserCreateBody,
    });
  typia.assert(premiumUser);

  // 2. Create a regular user account and authenticate
  const regularUserCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const regularUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: regularUserCreateBody,
    });
  typia.assert(regularUser);

  // 3. Switch to regular user session by login
  const regularUserLoginBody = {
    email: regularUser.email,
    password_hash: regularUserCreateBody.password_hash,
  } satisfies IRecipeSharingRegularUser.ILogin;

  const regularUserLogin: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: regularUserLoginBody,
    });
  typia.assert(regularUserLogin);

  // 4. Create a personalized feed entry by the regular user
  const personalizedFeedCreateBody = {
    user_id: regularUser.id,
    recipe_id: typia.random<string & tags.Format<"uuid">>(),
    originator_user_id: regularUser.id,
  } satisfies IRecipeSharingPersonalizedFeed.ICreate;

  const personalizedFeed: IRecipeSharingPersonalizedFeed =
    await api.functional.recipeSharing.regularUser.personalizedFeeds.create(
      connection,
      { body: personalizedFeedCreateBody },
    );
  typia.assert(personalizedFeed);

  // 5. Switch back to premium user session by login
  const premiumUserLoginBody = {
    email: premiumUser.email,
    password_hash: premiumUserCreateBody.password_hash,
  } satisfies IRecipeSharingPremiumUser.ILogin;

  const premiumUserLogin: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.login(connection, {
      body: premiumUserLoginBody,
    });
  typia.assert(premiumUserLogin);

  // 6. Retrieve the personalized feed entry by premium user
  const retrievedFeed: IRecipeSharingPersonalizedFeed =
    await api.functional.recipeSharing.premiumUser.personalizedFeeds.at(
      connection,
      {
        personalizedFeedId: personalizedFeed.id,
      },
    );
  typia.assert(retrievedFeed);

  // 7. Validate that the retrieved feed's ID matches created feed ID
  TestValidator.equals(
    "retrieved personalized feed ID equals created feed ID",
    retrievedFeed.id,
    personalizedFeed.id,
  );

  // 8. Validate that user_id, recipe_id, and originator_user_id are present and UUID format
  TestValidator.predicate(
    "retrieved feed user_id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      retrievedFeed.user_id,
    ),
  );
  TestValidator.predicate(
    "retrieved feed recipe_id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      retrievedFeed.recipe_id,
    ),
  );
  TestValidator.predicate(
    "retrieved feed originator_user_id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      retrievedFeed.originator_user_id,
    ),
  );

  // 9. Validate that created_at and updated_at are valid date-time strings
  TestValidator.predicate(
    "retrieved feed created_at is ISO 8601 date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(
      retrievedFeed.created_at,
    ),
  );
  TestValidator.predicate(
    "retrieved feed updated_at is ISO 8601 date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(
      retrievedFeed.updated_at,
    ),
  );
}
