import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderEndUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderEndUser";

/**
 * This E2E test function validates the token refresh flow for an end user via
 * the /auth/endUser/refresh endpoint.
 *
 * It covers the lifecycle of token management starting from user registration,
 * where an end user is created and initial JWT tokens (access and refresh) are
 * issued. The test then performs a valid refresh token request and validates
 * that new JWT tokens are issued. It also attempts a refresh with an invalid
 * token and checks that an error is correctly thrown.
 *
 * This ensures secure management of JWT tokens and proper error handling for
 * invalid refresh attempts.
 */
export async function test_api_enduser_token_refresh_with_valid_and_invalid_tokens(
  connection: api.IConnection,
) {
  // Step 1: Register a new end user and obtain tokens
  const email = typia.random<string & tags.Format<"email">>();
  const passwordHash = RandomGenerator.alphaNumeric(16);
  const createBody = {
    email: email,
    password_hash: passwordHash,
  } satisfies ITelegramFileDownloaderEndUser.ICreate;

  const authorized: ITelegramFileDownloaderEndUser.IAuthorized =
    await api.functional.auth.endUser.join(connection, { body: createBody });
  typia.assert(authorized);

  // Step 2: Refresh tokens with valid refresh token
  const refreshBody = {
    refresh_token: authorized.token.refresh,
  } satisfies ITelegramFileDownloaderEndUser.IRefresh;

  const refreshed: ITelegramFileDownloaderEndUser.IAuthorized =
    await api.functional.auth.endUser.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshed);

  // Verify that new tokens are different from original
  TestValidator.notEquals(
    "refresh token should be updated",
    authorized.token.refresh,
    refreshed.token.refresh,
  );

  TestValidator.notEquals(
    "access token should be updated",
    authorized.token.access,
    refreshed.token.access,
  );

  // Step 3: Attempt refresh with invalid refresh token and expect failure
  const invalidRefreshBody = {
    refresh_token: RandomGenerator.alphaNumeric(64),
  } satisfies ITelegramFileDownloaderEndUser.IRefresh;

  await TestValidator.error(
    "refresh should fail with invalid refresh token",
    async () => {
      await api.functional.auth.endUser.refresh(connection, {
        body: invalidRefreshBody,
      });
    },
  );
}
