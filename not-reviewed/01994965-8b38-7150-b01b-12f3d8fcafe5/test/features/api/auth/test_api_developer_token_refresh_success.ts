import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDeveloper";

/**
 * This function tests the full JWT token refresh lifecycle for developer
 * users.
 *
 * It covers user registration, login, refresh token usage, and validation
 * of new tokens.
 *
 * Steps:
 *
 * 1. Registers a developer user using /auth/developer/join
 * 2. Logs in with correct credentials with /auth/developer/login
 * 3. Uses the refresh token to obtain new JWT tokens with
 *    /auth/developer/refresh
 * 4. Asserts the new tokens permit access and are different from the original
 * 5. Tests invalid refresh token error handling to validate security
 *    enforcement
 */
export async function test_api_developer_token_refresh_success(
  connection: api.IConnection,
) {
  // Step 1: Register a new developer user with email and password hash
  const email: string = typia.random<string & tags.Format<"email">>();
  const passwordHash: string = RandomGenerator.alphaNumeric(16);
  const createBody = {
    email,
    password_hash: passwordHash,
  } satisfies ITelegramFileDownloaderDeveloper.ICreate;

  const developer: ITelegramFileDownloaderDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: createBody,
    });
  typia.assert(developer);

  // Step 2: Log in with credentials to get initial tokens
  const loginBody = {
    email,
    password: passwordHash,
  } satisfies ITelegramFileDownloaderDeveloper.ILogin;
  const loginResult: ITelegramFileDownloaderDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, {
      body: loginBody,
    });
  typia.assert(loginResult);

  // Validate token presence
  TestValidator.predicate(
    "login token contains access",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "login token contains refresh",
    loginResult.token.refresh.length > 0,
  );

  // Step 3: Refresh tokens using the refresh token
  const refreshBody = {
    refreshToken: loginResult.token.refresh,
  } satisfies ITelegramFileDownloaderDeveloper.IRefresh;
  const refreshResult: ITelegramFileDownloaderDeveloper.IAuthorized =
    await api.functional.auth.developer.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshResult);

  // Step 4: Assert refreshed tokens differ from the original tokens
  TestValidator.notEquals(
    "access tokens should differ after refresh",
    refreshResult.token.access,
    loginResult.token.access,
  );
  TestValidator.notEquals(
    "refresh tokens should differ after refresh",
    refreshResult.token.refresh,
    loginResult.token.refresh,
  );

  // Step 5: Ensure using an invalid refresh token causes error
  await TestValidator.error(
    "refresh with invalid token should fail",
    async () => {
      const invalidRefresh = {
        refreshToken: "invalid-refresh-token-not-real",
      } satisfies ITelegramFileDownloaderDeveloper.IRefresh;
      await api.functional.auth.developer.refresh(connection, {
        body: invalidRefresh,
      });
    },
  );
}
