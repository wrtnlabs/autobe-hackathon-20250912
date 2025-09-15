import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingPremiumUser";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * This test function validates the secure and paginated retrieval of
 * premium users using regular user authentication.
 *
 * It simulates a regular user joining via /auth/regularUser/join to obtain
 * authenticated tokens, then uses that context to call the
 * /recipeSharing/regularUser/premiumUsers PATCH endpoint to retrieve a
 * filtered and paginated list of premium users.
 *
 * The test verifies successful retrieval of authenticatable data, correct
 * pagination, and proper access control by verifying unauthenticated
 * requests fail.
 */
export async function test_api_premium_user_list_retrieval_with_regularuser_authentication(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a regular user
  const regularUserCreateBody = {
    email: `${RandomGenerator.alphaNumeric(10)}@test.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const regularUserAuthorized: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: regularUserCreateBody,
    });
  typia.assert(regularUserAuthorized);

  // 2. Use authenticated connection to request premium users list
  const premiumUserRequestBody = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    username: RandomGenerator.name(),
    premium_since: new Date(
      Date.now() - 1000 * 60 * 60 * 24 * 365,
    ).toISOString(),
    page: 1,
    limit: 10,
    sortBy: "username",
    order: "asc",
  } satisfies IRecipeSharingPremiumUser.IRequest;

  const premiumUsersPage: IPageIRecipeSharingPremiumUser =
    await api.functional.recipeSharing.regularUser.premiumUsers.index(
      connection,
      {
        body: premiumUserRequestBody,
      },
    );
  typia.assert(premiumUsersPage);

  TestValidator.predicate(
    "pagination current page is 1",
    premiumUsersPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    premiumUsersPage.pagination.limit === 10,
  );
  TestValidator.predicate(
    "premium users data is array",
    Array.isArray(premiumUsersPage.data),
  );

  // 3. Attempt access without authentication to verify authorization enforcement
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("unauthenticated access should fail", async () => {
    await api.functional.recipeSharing.regularUser.premiumUsers.index(
      unauthenticatedConnection,
      {
        body: {} satisfies IRecipeSharingPremiumUser.IRequest,
      },
    );
  });
}
