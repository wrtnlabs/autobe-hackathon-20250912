import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingPersonalizedFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingPersonalizedFeed";
import type { IRecipeSharingPersonalizedFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPersonalizedFeed";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";

/**
 * Validate unauthorized access to personalized feeds resource.
 *
 * Business context: Access to personalized feeds is restricted to authenticated
 * premium users with valid JWT tokens. This test ensures that unauthenticated
 * or improperly authenticated access attempts are rejected with 401
 * Unauthorized.
 *
 * Steps:
 *
 * 1. A premium user joins to establish required system context.
 * 2. Attempt to fetch personalized feeds without authentication - expect 401
 *    error.
 * 3. Attempt to fetch personalized feeds with an empty or improper body even after
 *    authentication or with no valid JWT - expect 401 error.
 *
 * This test secures the personalized feeds endpoint from unauthorized use.
 */
export async function test_api_personalized_feed_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Premium user joins as prerequisite
  const premiumUser: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.join(connection, {
      body: {
        email: RandomGenerator.alphaNumeric(8) + "@example.com",
        password_hash: RandomGenerator.alphaNumeric(20),
        username: RandomGenerator.name(2),
      } satisfies IRecipeSharingPremiumUser.ICreate,
    });
  typia.assert(premiumUser);

  // 2. Attempt unauthorized request without authentication
  await TestValidator.error(
    "Unauthorized request without authentication should fail",
    async () => {
      const unauth: api.IConnection = { ...connection, headers: {} };
      await api.functional.recipeSharing.premiumUser.personalizedFeeds.index(
        unauth,
        {
          body: {
            user_id: null,
            recipe_id: null,
            originator_user_id: null,
            page: null,
            limit: null,
            sort_by: null,
            order: null,
          } satisfies IRecipeSharingPersonalizedFeed.IRequest,
        },
      );
    },
  );

  // 3. Attempt unauthorized request with missing or invalid token
  await TestValidator.error(
    "Unauthorized request with invalid or missing JWT should fail",
    async () => {
      const invalidAuthConn: api.IConnection = { ...connection, headers: {} };
      await api.functional.recipeSharing.premiumUser.personalizedFeeds.index(
        invalidAuthConn,
        {
          body: {
            user_id: null,
            recipe_id: null,
            originator_user_id: null,
            page: null,
            limit: null,
            sort_by: null,
            order: null,
          } satisfies IRecipeSharingPersonalizedFeed.IRequest,
        },
      );
    },
  );
}
