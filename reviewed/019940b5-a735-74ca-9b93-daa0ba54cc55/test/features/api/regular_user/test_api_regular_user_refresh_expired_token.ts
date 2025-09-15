import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";

/**
 * Test the failure scenario of refreshing JWT tokens for a regular user
 * when the refresh token is expired or invalid.
 *
 * This test follows these steps:
 *
 * 1. Create a new regular user via the /auth/regularUser/join API endpoint.
 *    This also establishes authentication tokens for the user.
 * 2. Attempt a token refresh using an expired or tampered refresh token.
 * 3. Verify that the refresh API rejects the request by throwing an HTTP
 *    error, indicating token invalidity or expiration.
 */
export async function test_api_regular_user_refresh_expired_token(
  connection: api.IConnection,
) {
  // 1. Create a regular user to obtain valid tokens
  const createBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(20),
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: false,
  } satisfies IEventRegistrationRegularUser.ICreate;
  const authorizedUser: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: createBody,
    });
  typia.assert(authorizedUser);

  // 2. Tamper the refresh token to simulate an expired or invalid token
  const expiredRefreshToken = authorizedUser.token.refresh + "tampered";
  const refreshBody = {
    refresh_token: expiredRefreshToken,
  } satisfies IEventRegistrationRegularUser.IRefresh;

  // 3. Attempt to refresh tokens using the invalid refresh token and expect an error
  await TestValidator.error(
    "refresh should fail with expired or invalid token",
    async () => {
      await api.functional.auth.regularUser.refresh.refreshRegularUser(
        connection,
        {
          body: refreshBody,
        },
      );
    },
  );
}
