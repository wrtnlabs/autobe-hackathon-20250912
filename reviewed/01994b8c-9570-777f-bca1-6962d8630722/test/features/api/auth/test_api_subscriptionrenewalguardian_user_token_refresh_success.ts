import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ISubscriptionRenewalGuardianUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianUser";

/**
 * Test token refresh lifecycle for a Subscription Renewal Guardian user.
 *
 * This E2E test covers the full token lifecycle of a user in the
 * Subscription Renewal Guardian system.
 *
 * Steps:
 *
 * 1. User account creation using /auth/user/join with random, valid email and
 *    password_hash.
 * 2. User login via /auth/user/login with same credentials to retrieve tokens.
 * 3. Token refresh via /auth/user/refresh using the valid refresh token to
 *    obtain new access token.
 * 4. Validations of token structures and key properties (UUID formats, email
 *    formatting, and token content).
 * 5. Negative tests with invalid and expired refresh tokens to verify error
 *    handling.
 */
export async function test_api_subscriptionrenewalguardian_user_token_refresh_success(
  connection: api.IConnection,
) {
  // Step 1: Create user account
  const email = `user_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const password = RandomGenerator.alphaNumeric(16);
  const password_hash = password; // Simulate password hash for the test

  const joinBody = {
    email: email,
    password_hash: password_hash,
  } satisfies ISubscriptionRenewalGuardianUser.ICreate;

  const joinResult: ISubscriptionRenewalGuardianUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: joinBody,
    });
  typia.assert(joinResult);
  TestValidator.equals(
    "join: returned email matches input",
    joinResult.email,
    email,
  );

  // Step 2: Login with same credentials
  const loginBody = {
    email: email,
    password_hash: password_hash,
  } satisfies ISubscriptionRenewalGuardianUser.ILogin;

  const loginResult: ISubscriptionRenewalGuardianUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: loginBody,
    });
  typia.assert(loginResult);
  TestValidator.equals(
    "login: returned email matches input",
    loginResult.email,
    email,
  );

  // Step 3: Token Refresh using refresh token from login
  const refreshBody = {
    refresh_token: loginResult.token.refresh,
  } satisfies ISubscriptionRenewalGuardianUser.IRefresh;

  const refreshResult: ISubscriptionRenewalGuardianUser.IAuthorized =
    await api.functional.auth.user.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshResult);
  TestValidator.equals(
    "refresh: returned email matches input",
    refreshResult.email,
    email,
  );

  // Step 4: Validations of token structure and formats
  TestValidator.predicate(
    "join: access token is non-empty",
    joinResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "join: refresh token is non-empty",
    joinResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "join: access expired_at format",
    /^[\dT:\-\.Z]+$/.test(joinResult.token.expired_at),
  );
  TestValidator.predicate(
    "join: refresh refreshable_until format",
    /^[\dT:\-\.Z]+$/.test(joinResult.token.refreshable_until),
  );

  TestValidator.predicate(
    "login: access token is non-empty",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "login: refresh token is non-empty",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "login: access expired_at format",
    /^[\dT:\-\.Z]+$/.test(loginResult.token.expired_at),
  );
  TestValidator.predicate(
    "login: refresh refreshable_until format",
    /^[\dT:\-\.Z]+$/.test(loginResult.token.refreshable_until),
  );

  TestValidator.predicate(
    "refresh: access token is non-empty",
    refreshResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh: refresh token is non-empty",
    refreshResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "refresh: access expired_at format",
    /^[\dT:\-\.Z]+$/.test(refreshResult.token.expired_at),
  );
  TestValidator.predicate(
    "refresh: refresh refreshable_until format",
    /^[\dT:\-\.Z]+$/.test(refreshResult.token.refreshable_until),
  );

  // Step 5: Negative tests for invalid refresh tokens
  await TestValidator.error("error: refresh with invalid token", async () => {
    await api.functional.auth.user.refresh(connection, {
      body: {
        refresh_token: "invalid-token-value",
      } satisfies ISubscriptionRenewalGuardianUser.IRefresh,
    });
  });

  // Since we cannot simulate token expiry easily, test that empty string also fails
  await TestValidator.error("error: refresh with empty token", async () => {
    await api.functional.auth.user.refresh(connection, {
      body: {
        refresh_token: "",
      } satisfies ISubscriptionRenewalGuardianUser.IRefresh,
    });
  });
}
