import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";

/**
 * Log in a systemAdmin user and verify tokens and authorization info.
 *
 * This test registers a systemAdmin account then performs login with correct
 * and incorrect credentials. It confirms successful login returns valid tokens
 * and user info, and invalid login fails accordingly.
 *
 * Steps:
 *
 * 1. Register systemAdmin user with known email/password.
 * 2. Login with correct password and validate the authorized response.
 * 3. Login with wrong password and verify error thrown.
 */
export async function test_api_auth_systemadmin_login_success(
  connection: api.IConnection,
) {
  // Step 1: Register systemAdmin user
  const email = `systemadmin${Date.now()}@example.com`;
  const password = "Password123!";
  const joinBody = {
    email,
    password,
  } satisfies INotificationWorkflowSystemAdmin.IRequestJoin;
  const joinedUser = await api.functional.auth.systemAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(joinedUser);
  TestValidator.predicate(
    "joined user has valid id",
    typeof joinedUser.id === "string",
  );
  TestValidator.predicate(
    "joined user has token access",
    typeof joinedUser.token.access === "string",
  );

  // Step 2: Successful login
  const loginBody = {
    email,
    password,
  } satisfies INotificationWorkflowSystemAdmin.IRequestLogin;
  const auth = await api.functional.auth.systemAdmin.login(connection, {
    body: loginBody,
  });
  typia.assert(auth);

  TestValidator.predicate(
    "login response has valid id",
    typeof auth.id === "string",
  );
  TestValidator.equals("login email matches", auth.email, email);
  TestValidator.predicate(
    "token access is string",
    typeof auth.token.access === "string",
  );
  TestValidator.predicate(
    "token refresh is string",
    typeof auth.token.refresh === "string",
  );

  // token expiry strings should match ISO 8601 datetime format
  TestValidator.predicate(
    "token expired_at is ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
      auth.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "token refreshable_until is ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
      auth.token.refreshable_until,
    ),
  );

  // Step 3: Login failure with wrong password
  await TestValidator.error("login fails with wrong password", async () => {
    await api.functional.auth.systemAdmin.login(connection, {
      body: {
        email,
        password: "WrongPassword!",
      } satisfies INotificationWorkflowSystemAdmin.IRequestLogin,
    });
  });
}
