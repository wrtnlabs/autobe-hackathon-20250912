import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingPremiumUser";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";

/**
 * Test paginated retrieval of premium users with authentication.
 *
 * This test covers the authentication flow of a premium user via join, then
 * uses that authenticated context to retrieve a paginated and filtered list
 * of premium users. It validates response pagination metadata, data
 * consistency, sorting order, and authorization enforcement.
 *
 * The test also verifies error cases:
 *
 * - Access without authentication token results in failure.
 * - Access with an invalid token results in failure.
 *
 * Uses typia.assert for response validation and TestValidator for business
 * logic validation.
 *
 * The test uses realistic randomly generated data for new premium user
 * creation and simulates filtering and pagination requests with nullable
 * and non-null filters.
 *
 * The SDK automatically handles token management through the join
 * authentication.
 *
 * @param connection API connection object
 */
export async function test_api_premium_user_list_retrieval_with_premiumuser_authentication(
  connection: api.IConnection,
) {
  // 1. Create premiumUser: join to establish authentication context
  const createBody = {
    email: `user${Date.now()}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.name(),
  } satisfies IRecipeSharingPremiumUser.ICreate;
  const authorizedUser = await api.functional.auth.premiumUser.join(
    connection,
    { body: createBody },
  );
  typia.assert(authorizedUser);

  // connection.headers.Authorization automatically updated by SDK

  // 2. List premium users with pagination and filtering (no filters)
  const listQuery = {
    email: null,
    username: null,
    premium_since: null,
    page: 1,
    limit: 10,
    sortBy: "created_at",
    order: "asc",
  } satisfies IRecipeSharingPremiumUser.IRequest;

  const firstListResponse =
    await api.functional.recipeSharing.premiumUser.premiumUsers.index(
      connection,
      { body: listQuery },
    );
  typia.assert(firstListResponse);

  TestValidator.predicate(
    "page is 1",
    firstListResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit is 10",
    firstListResponse.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pages >= 1",
    firstListResponse.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "records >= 1",
    firstListResponse.pagination.records >= 1,
  );
  TestValidator.predicate(
    "data length <= limit",
    firstListResponse.data.length <= 10,
  );

  // 3. List premium users with filtering by username
  const filteredQuery = {
    ...listQuery,
    username: authorizedUser.username,
    page: 1,
  } satisfies IRecipeSharingPremiumUser.IRequest;

  const filteredResponse =
    await api.functional.recipeSharing.premiumUser.premiumUsers.index(
      connection,
      { body: filteredQuery },
    );
  typia.assert(filteredResponse);

  TestValidator.predicate(
    "filtered data only with matching username",
    filteredResponse.data.every(
      (user) => user.username === authorizedUser.username,
    ),
  );

  // Validate ascending order by created_at
  for (let i = 1; i < filteredResponse.data.length; i++) {
    TestValidator.predicate(
      "created_at ascending order",
      filteredResponse.data[i - 1].created_at <=
        filteredResponse.data[i].created_at,
    );
  }

  // 4. Unauthorized access: connection with empty headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthorized access without token should fail",
    async () => {
      await api.functional.recipeSharing.premiumUser.premiumUsers.index(
        unauthConn,
        {
          body: listQuery,
        },
      );
    },
  );

  // 5. Invalid token header
  const fakeTokenConn: api.IConnection = {
    ...connection,
    headers: { Authorization: "Bearer invalidtoken123" },
  };

  await TestValidator.error(
    "access with invalid token should fail",
    async () => {
      await api.functional.recipeSharing.premiumUser.premiumUsers.index(
        fakeTokenConn,
        {
          body: listQuery,
        },
      );
    },
  );
}
