import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";

export async function test_api_auth_system_admin_login_success(
  connection: api.IConnection,
) {
  // Step 1: Create a system admin account using join API
  const adminEmail = `admin.${RandomGenerator.alphaNumeric(8)}@example.com`;
  const adminPassword = "P@ssw0rd123";

  const joinBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies INotificationWorkflowSystemAdmin.IRequestJoin;

  const joinedAdmin: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(joinedAdmin);

  // Step 2: Login with the same credentials
  const loginBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies INotificationWorkflowSystemAdmin.IRequestLogin;

  const loginResponse: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(loginResponse);

  // Step 3: Validate returned user information and JWT token
  TestValidator.equals(
    "login user id matches join",
    loginResponse.id,
    joinedAdmin.id,
  );
  TestValidator.equals(
    "login user email matches join",
    loginResponse.email,
    joinedAdmin.email,
  );
  TestValidator.equals(
    "login JWT access token matches join",
    loginResponse.token.access,
    joinedAdmin.token.access,
  );
  TestValidator.predicate(
    "JWT access token is a non-empty string",
    typeof loginResponse.token.access === "string" &&
      loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "JWT refresh token is a non-empty string",
    typeof loginResponse.token.refresh === "string" &&
      loginResponse.token.refresh.length > 0,
  );

  // Step 4: Confirm token expiry timestamps are valid ISO date strings
  TestValidator.predicate(
    "login token expired_at is ISO date",
    !isNaN(Date.parse(loginResponse.token.expired_at)),
  );
  TestValidator.predicate(
    "login token refreshable_until is ISO date",
    !isNaN(Date.parse(loginResponse.token.refreshable_until)),
  );
}
