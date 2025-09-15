import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ILibraryManagementGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ILibraryManagementGuestUser";

/**
 * Test the token refresh mechanism for guest users.
 *
 * This test function validates the following business logic and scenarios:
 *
 * 1. A guest user joins the system and receives initial authorization tokens.
 * 2. Using the initial tokens, the guest user calls the refresh endpoint to
 *    get new tokens.
 * 3. The refreshed tokens must differ from original tokens to ensure renewal.
 * 4. The refreshed authorization response must be valid and contain correct
 *    guest user identity and tokens.
 * 5. Test failure handling by attempting refresh with invalid or expired
 *    tokens, expecting 401 Unauthorized error.
 *
 * Steps:
 *
 * - Call `join` API to obtain initial tokens and guest identity.
 * - Call `refresh` API using the obtained tokens.
 * - Assert that refreshed tokens are different from original tokens.
 * - Assert that guest identity in refreshed response is valid.
 * - Attempt refresh with deliberately invalid tokens and assert 401
 *   Unauthorized error.
 *
 * This test ensures the refresh token mechanism works correctly and
 * enforces security policies.
 */
export async function test_api_guestuser_token_refresh_success(
  connection: api.IConnection,
) {
  // Step 1: Guest user joins to receive initial tokens
  const original: ILibraryManagementGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection);
  typia.assert(original);

  // Safely extract original tokens
  const originalToken: IAuthorizationToken = original.token;
  typia.assert(originalToken);

  // Step 2: Refresh tokens
  // The SDK automatically uses connection headers updated by `join` API call
  const refreshed: ILibraryManagementGuestUser.IAuthorized =
    await api.functional.auth.guestUser.refresh(connection);
  typia.assert(refreshed);

  // Step 3: Validate refreshed tokens differ from original
  const refreshedToken: IAuthorizationToken = refreshed.token;
  typia.assert(refreshedToken);

  TestValidator.notEquals(
    "Access token must be different after refresh",
    refreshedToken.access,
    originalToken.access,
  );
  TestValidator.notEquals(
    "Refresh token must be different after refresh",
    refreshedToken.refresh,
    originalToken.refresh,
  );

  // Step 4: Validate guest identity consistency
  TestValidator.equals(
    "Guest user ID must remain consistent",
    refreshed.id,
    original.id,
  );

  // Step 5: Test refresh with invalid token - forcibly change connection headers
  // This is to simulate unauthorized access due to invalid token.
  const invalidTokenConn: api.IConnection = {
    ...connection,
    headers: { Authorization: "Bearer invalid-token" },
  };
  await TestValidator.error(
    "Refresh with invalid token should fail with unauthorized",
    async () => {
      await api.functional.auth.guestUser.refresh(invalidTokenConn);
    },
  );

  // Test with empty Authorization header
  const emptyAuthConn: api.IConnection = {
    ...connection,
    headers: { Authorization: "" },
  };
  await TestValidator.error(
    "Refresh with empty token should fail with unauthorized",
    async () => {
      await api.functional.auth.guestUser.refresh(emptyAuthConn);
    },
  );
}
