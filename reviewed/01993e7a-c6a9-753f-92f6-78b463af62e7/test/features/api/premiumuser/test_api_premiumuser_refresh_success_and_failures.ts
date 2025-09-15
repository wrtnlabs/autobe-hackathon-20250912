import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";

/**
 * Test the refresh token operation for premium users.
 *
 * This test validates that the API correctly issues new JWT tokens when a
 * valid refresh token is provided. It also verifies failure cases where
 * invalid or expired refresh tokens are rejected.
 *
 * Steps:
 *
 * 1. Generate a valid refresh token string and request a token refresh.
 * 2. Assert the response includes all required fields and tokens.
 * 3. Test various invalid refresh token inputs and confirm errors are thrown.
 */
export async function test_api_premiumuser_refresh_success_and_failures(
  connection: api.IConnection,
) {
  // 1. Generate a valid refresh token string
  const validRefreshTokenString = typia.random<string & tags.Format<"uuid">>();
  const refreshRequestBody = {
    refresh_token: validRefreshTokenString,
  } satisfies IRecipeSharingPremiumUser.IRefresh;

  // 2. Call the refresh API with valid refresh token and verify successful authorization
  const authorized: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.refresh(connection, {
      body: refreshRequestBody,
    });
  typia.assert(authorized);

  // Validate key properties of the authorized user
  TestValidator.predicate(
    "authorized user has valid id",
    typeof authorized.id === "string" && authorized.id.length > 0,
  );
  TestValidator.predicate(
    "authorized user has valid email",
    typeof authorized.email === "string" && authorized.email.length > 0,
  );
  TestValidator.predicate(
    "authorized user has valid username",
    typeof authorized.username === "string" && authorized.username.length > 0,
  );
  TestValidator.predicate(
    "authorized user premium_since is ISO date",
    typeof authorized.premium_since === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(.\d+)?Z$/.test(
        authorized.premium_since,
      ),
  );

  // Tokens should be non-empty strings
  TestValidator.predicate(
    "authorized user has token.access",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "authorized user has token.refresh",
    authorized.token.refresh.length > 0,
  );

  // 3. Test invalid refresh token scenarios
  const invalidTokenStrings = [
    "invalid-token-1234",
    "",
    "expired-token-0000",
    "malformed-token-xyz",
  ];

  for (const tokenString of invalidTokenStrings) {
    const body = {
      refresh_token: tokenString,
    } satisfies IRecipeSharingPremiumUser.IRefresh;
    await TestValidator.error(
      `invalid refresh token should be rejected: ${tokenString}`,
      async () => {
        await api.functional.auth.premiumUser.refresh(connection, { body });
      },
    );
  }
}
