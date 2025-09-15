import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";

/**
 * Tests failure of refreshing admin JWT tokens using invalid or revoked refresh
 * tokens.
 *
 * This test first registers a new admin user via the /auth/admin/join endpoint
 * to establish a valid admin authentication context and obtain valid tokens.
 * Then it attempts to call the /auth/admin/refresh endpoint with multiple
 * invalid refresh tokens, such as malformed tokens or tokens derived by
 * altering the valid one, expecting each attempt to be denied and result in an
 * error.
 *
 * Validation confirms that invalid token refresh requests are rejected
 * securely, enforcing correct authentication and session handling policies.
 */
export async function test_api_admin_refresh_invalid_token(
  connection: api.IConnection,
) {
  // Step 1: Create admin user to get valid tokens
  const adminPayload = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;

  const adminAuthorized: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: adminPayload,
    });
  typia.assert(adminAuthorized);

  // Step 2: Define invalid refresh tokens to test rejection
  const validRefreshToken = adminAuthorized.token.refresh;
  const invalidRefreshTokens = [
    "invalidtoken1234567890",
    validRefreshToken.slice(1),
    validRefreshToken + "xyz",
    "",
  ];

  // Step 3: Test refresh attempts with invalid tokens expect errors
  for (const token of invalidRefreshTokens) {
    await TestValidator.error(
      `refresh fails with invalid refresh token '${token}'`,
      async () => {
        await api.functional.auth.admin.refresh.refreshAdminToken(connection, {
          body: {
            refresh_token: token,
          } satisfies IEventRegistrationAdmin.IRefresh,
        });
      },
    );
  }
}
