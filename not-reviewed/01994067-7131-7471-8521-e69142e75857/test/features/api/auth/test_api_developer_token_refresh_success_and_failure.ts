import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerDeveloper";

/**
 * This test validates the developer user token refresh endpoint
 * functioning.
 *
 * Steps:
 *
 * 1. Create a developer user with valid data.
 * 2. Log in as the developer to obtain access and refresh tokens.
 * 3. Use the valid refresh token to get new tokens
 * 4. Assert the new tokens are valid and differ from old ones
 * 5. Attempt refresh with an invalid token and expect an error.
 */
export async function test_api_developer_token_refresh_success_and_failure(
  connection: api.IConnection,
) {
  // 1. Create a developer user
  const passwordHash = RandomGenerator.alphaNumeric(32);
  const email = typia.random<string & tags.Format<"email">>();
  const developerCreate = {
    email,
    email_verified: true,
    password_hash: passwordHash,
  } satisfies IOauthServerDeveloper.ICreate;
  const createdDeveloper = await api.functional.auth.developer.join(
    connection,
    {
      body: developerCreate,
    },
  );
  typia.assert(createdDeveloper);

  // 2. Login as developer
  const loginBody = {
    email,
    password: passwordHash,
  } satisfies IOauthServerDeveloper.ILogin;
  const loginResponse = await api.functional.auth.developer.login(connection, {
    body: loginBody,
  });
  typia.assert(loginResponse);

  // Save tokens
  const originalAccessToken = loginResponse.token.access;
  const originalRefreshToken = loginResponse.token.refresh;

  // 3. Refresh token successfully
  const refreshBody = {
    refresh_token: originalRefreshToken,
  } satisfies IOauthServerDeveloper.IRefresh;

  const refreshedResponse = await api.functional.auth.developer.refresh(
    connection,
    {
      body: refreshBody,
    },
  );
  typia.assert(refreshedResponse);

  // Validate tokens changed
  TestValidator.notEquals(
    "access token should change after refresh",
    refreshedResponse.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "refresh token should change after refresh",
    refreshedResponse.token.refresh,
    originalRefreshToken,
  );

  // 4. Refresh token failure test with invalid token
  await TestValidator.error(
    "refresh with invalid token should fail",
    async () => {
      await api.functional.auth.developer.refresh(connection, {
        body: {
          refresh_token: RandomGenerator.alphaNumeric(64),
        } satisfies IOauthServerDeveloper.IRefresh,
      });
    },
  );
}
