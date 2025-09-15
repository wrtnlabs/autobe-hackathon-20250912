import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * End-to-end test for the successful JWT token refresh process of a regular
 * user.
 *
 * This test covers the full authentication flow for a regular user:
 *
 * 1. User registration with unique email, username, and secure password hash.
 * 2. User login using email and password hash to obtain initial access and
 *    refresh tokens.
 * 3. Token refresh using the received refresh token to obtain new access and
 *    refresh tokens.
 *
 * The test verifies that:
 *
 * - Each step returns valid data matching expected DTO types.
 * - New tokens after refresh are different from the initial tokens.
 * - The expiration timestamps (expired_at, refreshable_until) of the new
 *   tokens are later than the originals.
 * - Session continuity is maintained through valid token lifecycle
 *   management.
 *
 * All API calls use properly constructed request bodies with valid,
 * realistic data. Assertion and type validation are performed with
 * typia.assert and TestValidator.
 */
export async function test_api_regularuser_refresh_success(
  connection: api.IConnection,
) {
  // Step 1: Regular user registration
  const email = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const username = RandomGenerator.name(1);
  const passwordHash = RandomGenerator.alphaNumeric(32);

  const createBody = {
    email: email,
    username: username,
    password_hash: passwordHash,
  } satisfies IRecipeSharingRegularUser.ICreate;

  const registered = await api.functional.auth.regularUser.join(connection, {
    body: createBody,
  });
  typia.assert(registered);

  TestValidator.equals(
    "registered email equals input",
    registered.email,
    email,
  );
  TestValidator.equals(
    "registered username equals input",
    registered.username,
    username,
  );

  // Step 2: User login to obtain tokens
  const loginBody = {
    email: email,
    password_hash: passwordHash,
  } satisfies IRecipeSharingRegularUser.ILogin;

  const loggedIn = await api.functional.auth.regularUser.login(connection, {
    body: loginBody,
  });
  typia.assert(loggedIn);

  TestValidator.equals(
    "logged in email equals registered",
    loggedIn.email,
    email,
  );
  TestValidator.equals(
    "logged in username equals registered",
    loggedIn.username,
    username,
  );

  // Save initial tokens for later comparison
  const initialToken = loggedIn.token;
  typia.assert<IAuthorizationToken>(initialToken);

  // Step 3: Refresh tokens using the refresh token
  const refreshBody = {
    refresh_token: initialToken.refresh,
  } satisfies IRecipeSharingRegularUser.IRefresh;

  const refreshed = await api.functional.auth.regularUser.refresh(connection, {
    body: refreshBody,
  });
  typia.assert(refreshed);

  TestValidator.equals(
    "refreshed email equals registered",
    refreshed.email,
    email,
  );
  TestValidator.equals(
    "refreshed username equals registered",
    refreshed.username,
    username,
  );

  // Validate that new tokens are different from the initial tokens
  const newToken = refreshed.token;
  typia.assert<IAuthorizationToken>(newToken);

  TestValidator.notEquals(
    "access token differs after refresh",
    initialToken.access,
    newToken.access,
  );
  TestValidator.notEquals(
    "refresh token differs after refresh",
    initialToken.refresh,
    newToken.refresh,
  );

  // Validate expiration timestamps extended
  const initialExpiredAt = new Date(initialToken.expired_at).getTime();
  const refreshedExpiredAt = new Date(newToken.expired_at).getTime();
  TestValidator.predicate(
    "expired_at after refresh should be greater",
    refreshedExpiredAt > initialExpiredAt,
  );

  const initialRefreshableUntil = new Date(
    initialToken.refreshable_until,
  ).getTime();
  const refreshedRefreshableUntil = new Date(
    newToken.refreshable_until,
  ).getTime();
  TestValidator.predicate(
    "refreshable_until after refresh should be greater",
    refreshedRefreshableUntil > initialRefreshableUntil,
  );
}
