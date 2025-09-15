import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";

/**
 * Tests the Project Management Officer (PMO) token refresh mechanism.
 *
 * This test covers the full lifecycle of token refresh including:
 *
 * 1. User registration (join) - create a new PMO user with randomized but
 *    valid data.
 * 2. User login - authenticate using valid credentials to obtain access and
 *    refresh tokens.
 * 3. Successful token refresh - use the obtained refresh token to get new
 *    tokens.
 * 4. Failure token refresh - attempt to refresh with invalid token string and
 *    expect errors.
 *
 * The test verifies that valid refresh tokens provide new authorized
 * tokens, while invalid tokens cause authorization failures with proper
 * error propagation.
 */
export async function test_api_pmo_token_refresh_success_and_failure(
  connection: api.IConnection,
) {
  // 1. PMO User Registration
  const joinBody = {
    email: `user.${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "ValidPass123!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;

  const joined: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // 2. PMO User Login
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies ITaskManagementPmo.ILogin;
  const loggedIn: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedIn);

  TestValidator.equals(
    "login and join user id equality",
    loggedIn.id,
    joined.id,
  );

  // 3. Successful Token Refresh with valid refresh token
  const refreshBody = {
    refresh_token: loggedIn.token.refresh,
  } satisfies ITaskManagementPmo.IRefresh;
  const refreshed: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshed);

  TestValidator.equals(
    "refreshed user id equivalence",
    refreshed.id,
    joined.id,
  );

  // 4. Test failure token refresh with invalid refresh token
  await TestValidator.error(
    "refresh with invalid refresh token should fail",
    async () => {
      const invalidRefreshBody = {
        refresh_token: "invalid_refresh_token_string",
      } satisfies ITaskManagementPmo.IRefresh;
      await api.functional.auth.pmo.refresh(connection, {
        body: invalidRefreshBody,
      });
    },
  );
}
