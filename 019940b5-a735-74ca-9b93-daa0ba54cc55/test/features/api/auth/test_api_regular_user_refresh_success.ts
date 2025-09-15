import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";

/**
 * Test refreshing JWT tokens for a regular user.
 *
 * This function performs the following steps:
 *
 * 1. Registers a new regular user with randomized valid data via
 *    /auth/regularUser/join.
 * 2. Ensures the join response contains valid authorized user data with proper
 *    typing.
 * 3. Calls /auth/regularUser/refresh with the refresh token obtained from the
 *    join response.
 * 4. Asserts the new tokens are received and correctly structured.
 * 5. Validates that the new access token is different from the original.
 * 6. Validates that the new expiration timestamps are later than or equal to
 *    the originals.
 *
 * This test confirms proper issuance and updating of JWT tokens on refresh.
 */
export async function test_api_regular_user_refresh_success(
  connection: api.IConnection,
) {
  // Step 1: Register a new regular user
  const joinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: false,
  } satisfies IEventRegistrationRegularUser.ICreate;

  const authorized: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // Step 2: Call refresh API with original refresh token
  const refreshBody = {
    refresh_token: authorized.token.refresh,
  } satisfies IEventRegistrationRegularUser.IRefresh;

  const refreshed: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.refresh.refreshRegularUser(
      connection,
      {
        body: refreshBody,
      },
    );
  typia.assert(refreshed);

  // Step 3: Validate the refreshed token information
  TestValidator.predicate(
    "access token should be different after refresh",
    authorized.token.access !== refreshed.token.access,
  );

  TestValidator.predicate(
    "refresh token should be same after refresh",
    authorized.token.refresh === refreshed.token.refresh,
  );

  TestValidator.predicate(
    "expired_at should be equal or later after refresh",
    refreshed.token.expired_at >= authorized.token.expired_at,
  );

  TestValidator.predicate(
    "refreshable_until should be equal or later after refresh",
    refreshed.token.refreshable_until >= authorized.token.refreshable_until,
  );
}
