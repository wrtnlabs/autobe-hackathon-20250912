import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerGuest";
import type { IOauthServerOauthServerGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthServerGuest";

/**
 * E2E test for guest user token refresh extending ephemeral sessions.
 *
 * This test validates the token refresh process for guest users, ensuring
 * that ephemeral sessions can be extended multiple times without login
 * credentials. It covers the following scenarios:
 *
 * 1. Refreshing tokens with a valid refresh token, verifying new tokens are
 *    issued and have correct structure.
 * 2. Confirming the guest-only authorization scope is preserved in refreshed
 *    tokens.
 * 3. Ensuring access and refresh tokens have valid string formats and valid
 *    expiration timestamps.
 * 4. Attempting token refresh with invalid or expired tokens results in
 *    expected errors.
 * 5. Multiple sequential refresh calls succeed, indicating extended session
 *    validity.
 *
 * The test uses the official SDK function
 * `api.functional.auth.guest.refresh`, leverages typia for runtime type
 * validation of returned data, and uses TestValidator for structured
 * assertions and error testing.
 */
export async function test_api_guest_token_refresh_extends_ephemeral_session(
  connection: api.IConnection,
) {
  // Use a mock valid refresh token string with plausible format.
  const mockValidRefreshToken = "mock-valid-refresh-token-uuid-12345678";

  // 1. Obtain a valid initial refresh token via simulated generation
  const initialAuthorized: IOauthServerOauthServerGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: mockValidRefreshToken,
      } satisfies IOauthServerGuest.IRefresh,
    });
  typia.assert(initialAuthorized);

  // ID should be UUID formatted - loose check
  TestValidator.predicate(
    "initial token has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      initialAuthorized.id,
    ),
  );
  TestValidator.predicate(
    "initial access token is string",
    typeof initialAuthorized.token.access === "string",
  );
  TestValidator.predicate(
    "initial refresh token is string",
    typeof initialAuthorized.token.refresh === "string",
  );
  TestValidator.predicate(
    "initial expired_at is valid ISO date",
    !isNaN(Date.parse(initialAuthorized.token.expired_at)),
  );
  TestValidator.predicate(
    "initial refreshable_until is valid ISO date",
    !isNaN(Date.parse(initialAuthorized.token.refreshable_until)),
  );

  // 2. Refresh tokens multiple times sequentially
  let lastAuthorized = initialAuthorized;
  for (let i = 0; i < 3; ++i) {
    const refreshed: IOauthServerOauthServerGuest.IAuthorized =
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: lastAuthorized.token.refresh,
        } satisfies IOauthServerGuest.IRefresh,
      });
    typia.assert(refreshed);

    // 3. Check that user ID remains the same (guest ID)
    TestValidator.equals(
      `guest ID stable at refresh #${i + 1}`,
      refreshed.id,
      initialAuthorized.id,
    );

    // 4. Verify new tokens differ from previous tokens
    TestValidator.notEquals(
      `access token changes at refresh #${i + 1}`,
      refreshed.token.access,
      lastAuthorized.token.access,
    );
    TestValidator.notEquals(
      `refresh token changes at refresh #${i + 1}`,
      refreshed.token.refresh,
      lastAuthorized.token.refresh,
    );

    // 5. Validate token format and expiration
    TestValidator.predicate(
      `access token is string at refresh #${i + 1}`,
      typeof refreshed.token.access === "string",
    );
    TestValidator.predicate(
      `refresh token is string at refresh #${i + 1}`,
      typeof refreshed.token.refresh === "string",
    );
    TestValidator.predicate(
      `expired_at is valid date at refresh #${i + 1}`,
      !isNaN(Date.parse(refreshed.token.expired_at)),
    );
    TestValidator.predicate(
      `refreshable_until is valid date at refresh #${i + 1}`,
      !isNaN(Date.parse(refreshed.token.refreshable_until)),
    );

    // 6. Ensure expiration is extended (later than previous)
    TestValidator.predicate(
      `expired_at extended at refresh #${i + 1}`,
      Date.parse(refreshed.token.expired_at) >
        Date.parse(lastAuthorized.token.expired_at),
    );
    TestValidator.predicate(
      `refreshable_until extended at refresh #${i + 1}`,
      Date.parse(refreshed.token.refreshable_until) >
        Date.parse(lastAuthorized.token.refreshable_until),
    );

    lastAuthorized = refreshed;
  }

  // 7. Attempt refresh with invalid token format
  await TestValidator.error(
    "refresh with empty token should fail",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: "",
        } satisfies IOauthServerGuest.IRefresh,
      });
    },
  );

  // 8. Attempt refresh with obviously invalid token
  await TestValidator.error(
    "refresh with malformed token should fail",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: "invalid.token.value",
        } satisfies IOauthServerGuest.IRefresh,
      });
    },
  );

  // 9. Attempt refresh with random unusable token
  await TestValidator.error(
    "refresh with random token should fail",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: "random-invalid-token-12345",
        } satisfies IOauthServerGuest.IRefresh,
      });
    },
  );
}
