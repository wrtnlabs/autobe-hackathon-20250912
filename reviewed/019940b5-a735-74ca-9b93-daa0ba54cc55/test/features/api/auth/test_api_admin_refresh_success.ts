import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";

/**
 * Test that an admin user can successfully refresh the JWT authentication
 * tokens.
 *
 * This test will perform the following steps:
 *
 * 1. Create a new admin user account with realistic and valid input data.
 * 2. Assert the initial creation returned valid authorized admin user data
 *    with tokens.
 * 3. Use the refresh token from the initial creation to request new access
 *    tokens.
 * 4. Assert the refreshed tokens are valid and distinct from the initial ones,
 *    and verify expected JWT token properties such as access, refresh, and
 *    expiration timestamps.
 *
 * This ensures that the admin authentication refresh mechanism is correctly
 * generating new JWT tokens without errors.
 */
export async function test_api_admin_refresh_success(
  connection: api.IConnection,
) {
  // 1. Create a new admin user account
  const adminCreateBody = {
    email: `admin.${typia.random<string & tags.Format<"email">>()}`,
    password_hash: RandomGenerator.alphabets(16),
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;

  const authorizedAdmin = await api.functional.auth.admin.join.createAdminUser(
    connection,
    {
      body: adminCreateBody,
    },
  );
  typia.assert(authorizedAdmin);

  // 2. Use the refresh token for token refresh
  const refreshTokenBody = {
    refresh_token: authorizedAdmin.token.refresh,
  } satisfies IEventRegistrationAdmin.IRefresh;

  const refreshedAdmin =
    await api.functional.auth.admin.refresh.refreshAdminToken(connection, {
      body: refreshTokenBody,
    });
  typia.assert(refreshedAdmin);

  // 3. Validate that the refreshed tokens are different from the initial ones
  TestValidator.notEquals(
    "access token should be different after refresh",
    authorizedAdmin.token.access,
    refreshedAdmin.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be different after refresh",
    authorizedAdmin.token.refresh,
    refreshedAdmin.token.refresh,
  );

  // 4. Validate that expiry timestamps are valid ISO 8601 and refreshed tokens have later expirations
  TestValidator.predicate(
    "refreshed expired_at should be a valid ISO 8601 date-time string",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?Z$/.test(
      refreshedAdmin.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refreshed refreshable_until should be a valid ISO 8601 date-time string",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?Z$/.test(
      refreshedAdmin.token.refreshable_until,
    ),
  );
  TestValidator.predicate(
    "refreshed expired_at should be later than or equal to original",
    refreshedAdmin.token.expired_at >= authorizedAdmin.token.expired_at,
  );
  TestValidator.predicate(
    "refreshed refreshable_until should be later than or equal to original",
    refreshedAdmin.token.refreshable_until >=
      authorizedAdmin.token.refreshable_until,
  );
}
