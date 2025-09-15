import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowManager";

/**
 * Validate successful login of a workflowManager user.
 *
 * This test covers user creation followed by login attempt with valid
 * credentials. It verifies that an authorization token is returned with correct
 * structure. It also tests for login failure by providing invalid credentials.
 */
export async function test_api_auth_workflowmanager_login_success(
  connection: api.IConnection,
) {
  // Step 1. Create a new workflowManager user with email and password hash
  const email = `${RandomGenerator.name(1)}@example.com`;
  const passwordPlain = "validPassword1234";
  // Simulate password hash as a hexadecimal string
  const password_hash = ArrayUtil.repeat(32, () =>
    RandomGenerator.pick([
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "a",
      "b",
      "c",
      "d",
      "e",
      "f",
    ]),
  ).join("");

  const createBody = {
    email,
    password_hash,
  } satisfies INotificationWorkflowWorkflowManager.ICreate;

  const authorizedUser: INotificationWorkflowWorkflowManager.IAuthorized =
    await api.functional.auth.workflowManager.join(connection, {
      body: createBody,
    });
  typia.assert(authorizedUser);

  // Step 2. Attempt login with valid credentials
  const loginBody = {
    email,
    password: passwordPlain,
  } satisfies INotificationWorkflowWorkflowManager.ILogin;

  const loginResult: INotificationWorkflowWorkflowManager.IAuthorized =
    await api.functional.auth.workflowManager.login(connection, {
      body: loginBody,
    });
  typia.assert(loginResult);

  // Validate important fields from login response
  TestValidator.equals("email matches after login", loginResult.email, email);

  // token object validation
  const token: IAuthorizationToken = loginResult.token;
  typia.assert(token);

  TestValidator.predicate(
    "access token is a non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token is a non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );

  // date-time format validation using typia.assert indirectly by type system
  typia.assert<string & tags.Format<"date-time">>(token.expired_at);
  typia.assert<string & tags.Format<"date-time">>(token.refreshable_until);

  // Step 3. Attempt login with invalid credentials and expect error
  const invalidLoginBody = {
    email,
    password: "wrongPassword",
  } satisfies INotificationWorkflowWorkflowManager.ILogin;

  await TestValidator.error("login fails with invalid password", async () => {
    await api.functional.auth.workflowManager.login(connection, {
      body: invalidLoginBody,
    });
  });
}
