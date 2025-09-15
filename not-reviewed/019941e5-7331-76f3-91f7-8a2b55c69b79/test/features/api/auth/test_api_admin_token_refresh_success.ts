import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEasySignAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEasySignAdmin";

/**
 * Validate the administrator token refresh success workflow.
 *
 * This test covers creating a new admin user, logging in to obtain valid
 * JWT tokens, and successfully refreshing the token. It ensures that the
 * retrieved tokens after refresh are valid and different from the login
 * tokens, confirming proper token lifecycle management.
 *
 * Steps:
 *
 * 1. Create an admin user with a unique email and random username.
 * 2. Login as the admin user with the set credentials to obtain JWT tokens.
 * 3. Refresh the JWT tokens using the refresh token obtained from login.
 * 4. Validate that refreshed tokens differ from the original ones.
 * 5. Confirm the expected ISO 8601 format for token expiry fields.
 */
export async function test_api_admin_token_refresh_success(
  connection: api.IConnection,
) {
  // 1. Admin user creation
  const createBody = {
    email: `admin_${RandomGenerator.alphaNumeric(6)}@test.com`,
    username: RandomGenerator.name(2),
  } satisfies IEasySignAdmin.ICreate;

  const createdAdmin: IEasySignAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: createBody });
  typia.assert(createdAdmin);

  // 2. Admin login with password (using a default password for tests)
  const loginBody = {
    email: createBody.email,
    password: "password1234",
  } satisfies IEasySignAdmin.ILoginRequest;

  const loggedInAdmin: IEasySignAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: loginBody });
  typia.assert(loggedInAdmin);

  TestValidator.equals(
    "logged in admin ID matches created admin ID",
    loggedInAdmin.id,
    createdAdmin.id,
  );

  // 3. Refresh token request using the refresh token
  const refreshBody = {
    refresh_token: loggedInAdmin.token.refresh,
  } satisfies IEasySignAdmin.IRefreshRequest;

  const refreshedAdmin: IEasySignAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, { body: refreshBody });
  typia.assert(refreshedAdmin);

  // Validation: refreshed tokens differ from the original login tokens
  TestValidator.notEquals(
    "refreshed access token should differ from login access token",
    refreshedAdmin.token.access,
    loggedInAdmin.token.access,
  );

  TestValidator.notEquals(
    "refreshed refresh token should differ from login refresh token",
    refreshedAdmin.token.refresh,
    loggedInAdmin.token.refresh,
  );

  // Validation: expiration and refreshable times are ISO 8601 date-time strings
  TestValidator.predicate(
    "refreshed token expiration is valid ISO 8601",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/.test(
      refreshedAdmin.token.expired_at,
    ),
  );

  TestValidator.predicate(
    "refreshed token refreshable_until is valid ISO 8601",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/.test(
      refreshedAdmin.token.refreshable_until,
    ),
  );
}
