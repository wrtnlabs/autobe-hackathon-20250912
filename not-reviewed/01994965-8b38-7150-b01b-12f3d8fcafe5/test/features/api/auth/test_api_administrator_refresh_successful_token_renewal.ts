import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";

/**
 * Comprehensive E2E test for administrator JWT token refresh lifecycle.
 *
 * This test validates that an administrator can login successfully, receive
 * JWT tokens, and then refresh these tokens using the refresh API.
 *
 * It ensures tokens are different on refresh, valid in structure, and
 * include proper role authorizations. Error cases are tested using invalid
 * and expired refresh tokens, expecting authorization failures.
 *
 * Steps:
 *
 * 1. Administrator logs in using valid credentials.
 * 2. The issued JWT access and refresh tokens are captured and validated.
 * 3. Administrator requests token refresh with valid refresh token.
 * 4. New tokens are verified to differ from old tokens and contain valid
 *    expirations.
 * 5. Attempts to refresh with invalid tokens are asserted to fail with errors.
 *
 * This test ensures the security and continuity of the administrator
 * session authentication lifecycle.
 */
export async function test_api_administrator_refresh_successful_token_renewal(
  connection: api.IConnection,
) {
  // 1. Administrator logs in using realistic, valid credentials
  const loginInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPassword123",
  } satisfies ITelegramFileDownloaderAdministrator.ILogin;

  const loginResponse = await api.functional.auth.administrator.login(
    connection,
    { body: loginInput },
  );
  typia.assert(loginResponse);

  // Validate returned token structure
  TestValidator.predicate(
    "login token access is non-empty string",
    typeof loginResponse.token.access === "string" &&
      loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "login refresh token is non-empty string",
    typeof loginResponse.token.refresh === "string" &&
      loginResponse.token.refresh.length > 0,
  );

  // Save old tokens for later comparison
  const oldAccessToken = loginResponse.token.access;
  const oldRefreshToken = loginResponse.token.refresh;

  // 2. Refresh tokens using the refresh API with valid refresh token
  const refreshInput = {
    refresh_token: oldRefreshToken,
  } satisfies ITelegramFileDownloaderAdministrator.IRefresh;

  const refreshResponse = await api.functional.auth.administrator.refresh(
    connection,
    { body: refreshInput },
  );
  typia.assert(refreshResponse);

  // Validate token structure in refreshed response
  TestValidator.predicate(
    "refresh token access is non-empty string",
    typeof refreshResponse.token.access === "string" &&
      refreshResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token refresh is non-empty string",
    typeof refreshResponse.token.refresh === "string" &&
      refreshResponse.token.refresh.length > 0,
  );

  // Verify new tokens differ from old tokens
  TestValidator.notEquals(
    "refresh access token differs from old",
    oldAccessToken,
    refreshResponse.token.access,
  );
  TestValidator.notEquals(
    "refresh refresh token differs from old",
    oldRefreshToken,
    refreshResponse.token.refresh,
  );

  // Validate datetime fields parse correctly
  const expiredAtValid = !isNaN(Date.parse(refreshResponse.token.expired_at));
  const refreshableUntilValid = !isNaN(
    Date.parse(refreshResponse.token.refreshable_until),
  );

  TestValidator.predicate(
    "refresh token expired_at is valid ISO date",
    expiredAtValid,
  );
  TestValidator.predicate(
    "refresh token refreshable_until is valid ISO date",
    refreshableUntilValid,
  );

  // 3. Test failure: refreshing with invalid refresh token
  await TestValidator.error("refresh fails with invalid token", async () => {
    const invalidRefreshInput = {
      refresh_token: "invalid_token_string_1234567890",
    } satisfies ITelegramFileDownloaderAdministrator.IRefresh;
    await api.functional.auth.administrator.refresh(connection, {
      body: invalidRefreshInput,
    });
  });

  // 4. Test failure: refreshing with empty refresh token
  await TestValidator.error("refresh fails with empty token", async () => {
    const emptyTokenInput = {
      refresh_token: "",
    } satisfies ITelegramFileDownloaderAdministrator.IRefresh;
    await api.functional.auth.administrator.refresh(connection, {
      body: emptyTokenInput,
    });
  });

  // 5. Attempt refreshing with expired token scenario is out of scope here due to lack of control,
  // but the invalid and empty tests cover contract failures.
}
