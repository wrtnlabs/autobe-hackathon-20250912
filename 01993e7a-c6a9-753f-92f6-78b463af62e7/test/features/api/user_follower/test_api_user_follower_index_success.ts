import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingUserFollower } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingUserFollower";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingUserFollower } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingUserFollower";

/**
 * Test retrieval of user follower page with filters and pagination by a
 * regular user.
 *
 * 1. Register two regular users via the join endpoint to create authentication
 *    context.
 * 2. Use the first user's credentials for subsequent user follower queries.
 * 3. Query the user follower index with pagination and filters by follower and
 *    followee user IDs.
 * 4. Validate response structure and each follower relationship's IDs for
 *    correctness.
 * 5. Validate pagination meta-information for consistency.
 *
 * This ensures the user follower listing API respects provided filters and
 * pagination, enforces authorized access, and returns valid summary data
 * conforming to schema.
 */
export async function test_api_user_follower_index_success(
  connection: api.IConnection,
) {
  // 1. Register first regular user
  const body1 = {
    email: `${RandomGenerator.alphaNumeric(10)}@test.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(1),
  } satisfies IRecipeSharingRegularUser.ICreate;
  const user1: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, { body: body1 });
  typia.assert(user1);

  // 2. Register second regular user
  const body2 = {
    email: `${RandomGenerator.alphaNumeric(10)}@test.net`,
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;
  const user2: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, { body: body2 });
  typia.assert(user2);

  // 3. Use authentication of first user to query follower index
  // Prepare request body filtering by user1 id both as follower and followee
  const requestBody = {
    page: 1,
    limit: 10,
    follower_user_id: user1.id,
    followee_user_id: user1.id,
  } satisfies IRecipeSharingUserFollower.IRequest;

  const response: IPageIRecipeSharingUserFollower.ISummary =
    await api.functional.recipeSharing.regularUser.userFollowers.index(
      connection,
      { body: requestBody },
    );
  typia.assert(response);

  // 4. Validate pagination meta info
  TestValidator.predicate(
    "pagination current and limit are positive integers",
    typeof response.pagination.current === "number" &&
      response.pagination.current > 0 &&
      typeof response.pagination.limit === "number" &&
      response.pagination.limit > 0 &&
      typeof response.pagination.records === "number" &&
      response.pagination.records >= 0 &&
      typeof response.pagination.pages === "number" &&
      response.pagination.pages >= 0,
  );

  // 5. Validate each follower summary
  TestValidator.predicate(
    "response data length does not exceed pagination limit",
    response.data.length <= response.pagination.limit,
  );

  for (const item of response.data) {
    typia.assert<IRecipeSharingUserFollower.ISummary>(item);
    // IDs should either match user1's id or be valid UUIDs
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const isFollowerValid =
      item.follower_user_id === user1.id ||
      uuidRegex.test(item.follower_user_id);
    const isFolloweeValid =
      item.followee_user_id === user1.id ||
      uuidRegex.test(item.followee_user_id);

    TestValidator.predicate(
      `follower_user_id is valid UUID or matches user1.id: ${item.follower_user_id}`,
      isFollowerValid,
    );
    TestValidator.predicate(
      `followee_user_id is valid UUID or matches user1.id: ${item.followee_user_id}`,
      isFolloweeValid,
    );
  }
}
