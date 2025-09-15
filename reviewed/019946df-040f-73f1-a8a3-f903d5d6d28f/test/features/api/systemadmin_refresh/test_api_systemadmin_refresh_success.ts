import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * E2E test function to validate systemAdmin user's JWT token refresh
 * functionality.
 *
 * This test covers the full flow from user registration (join), login, and
 * subsequent token refreshing using the refresh token. It ensures that
 * valid tokens are properly refreshed and invalid tokens are rejected.
 *
 * Workflow steps:
 *
 * 1. Register a new systemAdmin user with valid details.
 * 2. Login the registered user to receive an initial set of JWT tokens.
 * 3. Invoke the refresh API with the valid refresh token to get new tokens.
 * 4. Verify new tokens differ from the old ones and expiration timestamps are
 *    valid.
 * 5. Test that using an invalid refresh token triggers an error.
 *
 * Validations include strict type assertions on API responses and business
 * logic checks via TestValidator for expected outcomes and error handling.
 *
 * This ensures robust, secure session management for system administrators
 * in the enterprise LMS.
 */
export async function test_api_systemadmin_refresh_success(
  connection: api.IConnection,
) {
  // 1. Join a new systemAdmin user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;
  const joined: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // 2. Login with the created user
  const loginBody = {
    email: joinBody.email,
    password_hash: joinBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;
  const loggedIn: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedIn);
  TestValidator.equals(
    "login user id equals join user id",
    loggedIn.id,
    joined.id,
  );

  // 3. Refresh the tokens using the refresh token from login response
  const refreshBody = {
    refresh_token: loggedIn.token.refresh,
  } satisfies IEnterpriseLmsSystemAdmin.IRefresh;
  const refreshed: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshed);
  TestValidator.notEquals(
    "refresh token refreshed new access token",
    refreshed.token.access,
    loggedIn.token.access,
  );
  TestValidator.notEquals(
    "refresh token refreshed new refresh token",
    refreshed.token.refresh,
    loggedIn.token.refresh,
  );
  TestValidator.predicate(
    "refresh token expiry date is valid ISO8601",
    !isNaN(Date.parse(refreshed.token.expired_at)),
  );
  TestValidator.predicate(
    "refresh token refreshable_until is valid ISO8601",
    !isNaN(Date.parse(refreshed.token.refreshable_until)),
  );

  // 4. Try refreshing with an invalid refresh token
  await TestValidator.error(
    "refresh with invalid token throws error",
    async () => {
      await api.functional.auth.systemAdmin.refresh(connection, {
        body: {
          refresh_token: "invalid.token.string",
        } satisfies IEnterpriseLmsSystemAdmin.IRefresh,
      });
    },
  );
}
