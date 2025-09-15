import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";

/**
 * Validates the JWT token refresh functionality for system administrator
 * session.
 *
 * This test ensures that after creating and logging in a system
 * administrator user, the refresh token mechanism issues new valid tokens
 * without requiring password re-entry.
 *
 * Steps:
 *
 * 1. Sign up a new system administrator user with valid email and password.
 * 2. Log in as the created user to receive initial access and refresh tokens.
 * 3. Use the refresh token to request new tokens.
 * 4. Assert that new tokens differ from the originals and proper data
 *    structures are returned.
 */
export async function test_api_system_admin_token_refresh_success(
  connection: api.IConnection,
) {
  // 1. Create a system administrator user
  const joinBody = {
    email: `sysadmin_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies INotificationWorkflowSystemAdmin.IRequestJoin;

  const joined: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // 2. Login as the system administrator using the same credentials
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies INotificationWorkflowSystemAdmin.IRequestLogin;

  const loggedIn: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedIn);

  // 3. Use the refresh token to refresh tokens
  const refreshBody = {
    refresh_token: loggedIn.token.refresh,
  } satisfies INotificationWorkflowSystemAdmin.IRequestRefresh;

  const refreshed: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshed);

  // 4. Validate that new tokens are issued and differ from original tokens
  TestValidator.notEquals(
    "access token should change after refresh",
    loggedIn.token.access,
    refreshed.token.access,
  );
  TestValidator.notEquals(
    "refresh token should change after refresh",
    loggedIn.token.refresh,
    refreshed.token.refresh,
  );

  // 5. Validate that user information stays consistent
  TestValidator.equals("user id should remain same", refreshed.id, loggedIn.id);
  TestValidator.equals(
    "user email should remain same",
    refreshed.email,
    loggedIn.email,
  );
}
