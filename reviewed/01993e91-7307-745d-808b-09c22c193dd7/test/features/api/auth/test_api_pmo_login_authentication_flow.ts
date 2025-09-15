import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";

/**
 * Test the login operation for Project Management Officer (PMO) users.
 *
 * This E2E test covers the complete authentication flow for "pmo" role
 * users:
 *
 * 1. Register a new PMO user via POST /auth/pmo/join with valid email,
 *    password, and name.
 * 2. Attempt login at POST /auth/pmo/login with correct credentials.
 * 3. Verify the response contains a valid JWT access token and refresh token.
 * 4. Assert that the logged-in user info matches registration and that
 *    password_hash is not exposed.
 * 5. Test login failure when password is incorrect; error must be thrown.
 * 6. Test login failure when email is unregistered; error must be thrown.
 *
 * This ensures that only registered PMO users can log in and that
 * authentication tokens are properly issued, while sensitive password
 * hashes remain confidential.
 */
export async function test_api_pmo_login_authentication_flow(
  connection: api.IConnection,
) {
  // 1. Register a new PMO user
  const email = typia.random<string & tags.Format<"email">>();
  const password = "StrongPass123!";
  const name = RandomGenerator.name();
  const joinBody = { email, password, name } satisfies ITaskManagementPmo.IJoin;
  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, { body: joinBody });
  typia.assert(pmoUser);

  // 2. Login with correct credentials
  const loginBody = { email, password } satisfies ITaskManagementPmo.ILogin;
  const loginResult: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.login(connection, { body: loginBody });
  typia.assert(loginResult);

  // 3. Validate tokens are present and valid strings
  TestValidator.predicate(
    "login provides access token",
    typeof loginResult.token.access === "string" &&
      loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "login provides refresh token",
    typeof loginResult.token.refresh === "string" &&
      loginResult.token.refresh.length > 0,
  );
  // token expiration formats
  TestValidator.predicate(
    "token expired_at matches ISO date-time format",
    typeof loginResult.token.expired_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.Z+-]+$/.test(
        loginResult.token.expired_at,
      ),
  );
  TestValidator.predicate(
    "token refreshable_until matches ISO date-time format",
    typeof loginResult.token.refreshable_until === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.Z+-]+$/.test(
        loginResult.token.refreshable_until,
      ),
  );

  // 4. Assert returned user info matches join info except password hash presence
  TestValidator.equals(
    "user email matches join email",
    loginResult.email,
    email,
  );
  TestValidator.equals("user name matches join name", loginResult.name, name);
  // Password hash MUST be present in join response
  TestValidator.predicate(
    "password_hash exists in join response",
    typeof pmoUser.password_hash === "string" &&
      pmoUser.password_hash.length > 0,
  );
  // Password hash MUST NOT be exposed in login response for security
  TestValidator.predicate(
    "password_hash is NOT exposed in login response",
    !("password_hash" in loginResult),
  );

  // 5. Test login failure: incorrect password
  await TestValidator.error(
    "login failure with incorrect password",
    async () => {
      const invalidPasswordBody = {
        email,
        password: "WrongPass!",
      } satisfies ITaskManagementPmo.ILogin;
      await api.functional.auth.pmo.login(connection, {
        body: invalidPasswordBody,
      });
    },
  );

  // 6. Test login failure: non-existent email
  await TestValidator.error(
    "login failure with non-existent email",
    async () => {
      const fakeEmail = `nonexistent_${typia.random<string & tags.Format<"email">>()}`;
      const fakeLoginBody = {
        email: fakeEmail,
        password,
      } satisfies ITaskManagementPmo.ILogin;
      await api.functional.auth.pmo.login(connection, { body: fakeLoginBody });
    },
  );
}
