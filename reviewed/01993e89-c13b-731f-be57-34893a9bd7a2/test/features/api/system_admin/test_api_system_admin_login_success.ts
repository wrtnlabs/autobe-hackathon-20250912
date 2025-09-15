import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";

/**
 * E2E test function to verify successful system administrator registration
 * and login.
 *
 * This test covers the full positive flow for a system administrator user:
 *
 * 1. Register a new system admin user with randomized email and password using
 *    join API.
 * 2. Confirm join response includes valid user info and JWT tokens.
 * 3. Perform login with the same credentials.
 * 4. Confirm login response matches expectations and provides JWT tokens.
 *
 * The test uses runtime type assertions and business validation checks to
 * ensure data consistency and correctness of the authentication flow.
 */
export async function test_api_system_admin_login_success(
  connection: api.IConnection,
) {
  // 1. Create a system administrator account by invoking join endpoint
  const email = `${RandomGenerator.alphaNumeric(10)}@example.com`;
  const password = RandomGenerator.alphaNumeric(12);
  const joinRequestBody = {
    email: email,
    password: password,
  } satisfies INotificationWorkflowSystemAdmin.IRequestJoin;

  const joinedUser: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: joinRequestBody,
    });
  typia.assert(joinedUser);

  // Validate the joined user properties
  TestValidator.predicate(
    "joined user has id",
    typeof joinedUser.id === "string" && joinedUser.id.length > 0,
  );
  TestValidator.equals("joined user email matches", joinedUser.email, email);
  TestValidator.predicate(
    "joined user password_hash is string",
    typeof joinedUser.password_hash === "string" &&
      joinedUser.password_hash.length > 0,
  );
  TestValidator.predicate(
    "joined user created_at format",
    typeof joinedUser.created_at === "string" &&
      joinedUser.created_at.length > 0,
  );
  TestValidator.predicate(
    "joined user updated_at format",
    typeof joinedUser.updated_at === "string" &&
      joinedUser.updated_at.length > 0,
  );

  // 2. Login with the registered system administrator credentials
  const loginRequestBody = {
    email: email,
    password: password,
  } satisfies INotificationWorkflowSystemAdmin.IRequestLogin;

  const loginResponse: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: loginRequestBody,
    });
  typia.assert(loginResponse);

  // Validate login response
  TestValidator.equals(
    "login user id matches joined user",
    loginResponse.id,
    joinedUser.id,
  );
  TestValidator.equals(
    "login user email matches joined email",
    loginResponse.email,
    email,
  );
  TestValidator.predicate(
    "login response contains password hash",
    typeof loginResponse.password_hash === "string" &&
      loginResponse.password_hash.length > 0,
  );
  TestValidator.predicate(
    "login response contains created_at",
    typeof loginResponse.created_at === "string" &&
      loginResponse.created_at.length > 0,
  );
  TestValidator.predicate(
    "login response contains updated_at",
    typeof loginResponse.updated_at === "string" &&
      loginResponse.updated_at.length > 0,
  );

  // Validate token properties
  TestValidator.predicate(
    "token.access is string",
    typeof loginResponse.token.access === "string" &&
      loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is string",
    typeof loginResponse.token.refresh === "string" &&
      loginResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at is string",
    typeof loginResponse.token.expired_at === "string" &&
      loginResponse.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token.refreshable_until is string",
    typeof loginResponse.token.refreshable_until === "string" &&
      loginResponse.token.refreshable_until.length > 0,
  );
}
