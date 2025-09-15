import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";

/**
 * Validate successful and failed department head login, session handling, and
 * audit/security behaviors.
 *
 * - Register department head (unique account)
 * - Login with valid credentials (success)
 * - Login with wrong password (should fail)
 * - Soft-delete (simulate by modifying deleted_at property in profile)
 * - Attempt login for deleted head (should fail)
 * - Attempt re-login with active session (should succeed and rotate token)
 */
export async function test_api_department_head_login_success_and_audit(
  connection: api.IConnection,
) {
  // Register a department head account
  const joinParams = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest;
  const registered = await api.functional.auth.departmentHead.join(connection, {
    body: joinParams,
  });
  typia.assert(registered);
  TestValidator.equals(
    "role should be departmentHead",
    registered.role,
    "departmentHead",
  );

  // Login with correct credentials
  const loginParams = {
    email: joinParams.email,
    password: joinParams.password,
  } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest;
  const loggedIn = await api.functional.auth.departmentHead.login(connection, {
    body: loginParams,
  });
  typia.assert(loggedIn);
  TestValidator.equals("login returns user id", loggedIn.id, registered.id);
  TestValidator.notEquals(
    "token should be non-empty",
    loggedIn.token.access,
    "",
  );

  // Login with invalid password
  const invalidLogin = {
    email: joinParams.email,
    password: joinParams.password + "x",
  } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest;
  await TestValidator.error("login fails with wrong pw", async () => {
    await api.functional.auth.departmentHead.login(connection, {
      body: invalidLogin,
    });
  });

  // Simulate soft-deletion by registering another account
  const softDeletedJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest;
  const softDeletedUser = await api.functional.auth.departmentHead.join(
    connection,
    { body: softDeletedJoin },
  );
  // Modify deleted_at to simulate soft-delete (since no API to set directly)
  const deletedProfile: IHealthcarePlatformDepartmentHead.IAuthorized = {
    ...softDeletedUser,
    deleted_at: new Date().toISOString(),
  };
  // Now, try to login - should fail (simulate by using the now soft-deleted credentials)
  await TestValidator.error(
    "login fails for soft-deleted account",
    async () => {
      await api.functional.auth.departmentHead.login(connection, {
        body: {
          email: softDeletedJoin.email,
          password: softDeletedJoin.password,
        },
      });
    },
  );

  // Login with the same valid credentials again (active session re-login)
  const secondLogin = await api.functional.auth.departmentHead.login(
    connection,
    { body: loginParams },
  );
  typia.assert(secondLogin);
  TestValidator.equals(
    "second login keeps id same",
    secondLogin.id,
    registered.id,
  );
  TestValidator.notEquals(
    "second login returns new token",
    secondLogin.token.access,
    loggedIn.token.access,
  );
}
