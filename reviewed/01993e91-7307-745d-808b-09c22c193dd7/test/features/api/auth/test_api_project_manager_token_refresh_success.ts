import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";

/**
 * Tests the Project Manager (PM) token refresh functionality.
 *
 * This test performs the entire flow from PM user registration to login,
 * and then uses the refresh token to obtain new JWT tokens. It ensures
 * tokens are correctly refreshed and that invalid refresh token usage is
 * properly rejected.
 *
 * The test asserts that:
 *
 * - PM user can register successfully
 * - Login returns valid tokens
 * - Refresh returns new tokens differing from initial ones
 * - Refresh fails on invalid token
 *
 * This validates the correct handling of JWT-based session management for
 * PM users.
 *
 * @param connection Authenticated API connection
 */
export async function test_api_project_manager_token_refresh_success(
  connection: api.IConnection,
) {
  // 1. Register a PM user
  const pmCreateBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password: "A1b2C3d4",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPm.ICreate;
  const pmAuthorized: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, { body: pmCreateBody });
  typia.assert(pmAuthorized);

  // 2. Login PM user to get initial tokens
  const pmLoginBody = {
    email: pmCreateBody.email,
    password: pmCreateBody.password,
  } satisfies ITaskManagementPm.ILogin;
  const loginResult: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.login(connection, { body: pmLoginBody });
  typia.assert(loginResult);

  // Validate tokens presence and validity for login
  TestValidator.predicate(
    "initial login access token is non-empty",
    typeof loginResult.token.access === "string" &&
      loginResult.token.access.length > 0,
  );

  TestValidator.predicate(
    "initial login refresh token is non-empty",
    typeof loginResult.token.refresh === "string" &&
      loginResult.token.refresh.length > 0,
  );

  // 3. Use valid refresh token to get new tokens
  const refreshBody = {
    refresh_token: loginResult.token.refresh,
  } satisfies ITaskManagementPm.IRefresh;

  const refreshResult: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.refresh(connection, { body: refreshBody });
  typia.assert(refreshResult);

  // Validate new tokens are issued
  TestValidator.predicate(
    "refresh access token is non-empty",
    typeof refreshResult.token.access === "string" &&
      refreshResult.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh refresh token is non-empty",
    typeof refreshResult.token.refresh === "string" &&
      refreshResult.token.refresh.length > 0,
  );

  // Validate tokens actually changed (new tokens must differ from initial)
  TestValidator.notEquals(
    "access token should change after refresh",
    loginResult.token.access,
    refreshResult.token.access,
  );

  TestValidator.notEquals(
    "refresh token should change after refresh",
    loginResult.token.refresh,
    refreshResult.token.refresh,
  );

  // 4. Test refresh with invalid refresh token to confirm error
  await TestValidator.error(
    "refresh with invalid token should fail",
    async () => {
      await api.functional.auth.pm.refresh(connection, {
        body: {
          refresh_token: "invalidtoken123456",
        } satisfies ITaskManagementPm.IRefresh,
      });
    },
  );
}
