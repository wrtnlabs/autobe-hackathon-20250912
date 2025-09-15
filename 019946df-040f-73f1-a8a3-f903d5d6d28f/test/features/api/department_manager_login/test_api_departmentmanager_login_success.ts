import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsDepartmentManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDepartmentManager";

export async function test_api_departmentmanager_login_success(
  connection: api.IConnection,
) {
  // 1. Create a new department manager account with randomized realistic data
  const departmentManagerEmail = `deptmanager_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const departmentManagerPassword = RandomGenerator.alphaNumeric(12);
  const departmentManagerFirstName = RandomGenerator.name(1);
  const departmentManagerLastName = RandomGenerator.name(1);

  const createdDepartmentManager: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.join(connection, {
      body: {
        email: departmentManagerEmail,
        password: departmentManagerPassword,
        first_name: departmentManagerFirstName,
        last_name: departmentManagerLastName,
      } satisfies IEnterpriseLmsDepartmentManager.ICreate,
    });
  typia.assert(createdDepartmentManager);

  // Validate that tokens are issued after join
  TestValidator.predicate(
    "JWT access token present after join",
    typeof createdDepartmentManager.token.access === "string" &&
      createdDepartmentManager.token.access.length > 0,
  );
  TestValidator.predicate(
    "JWT refresh token present after join",
    typeof createdDepartmentManager.token.refresh === "string" &&
      createdDepartmentManager.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "ID is a valid UUID after join",
    typeof createdDepartmentManager.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        createdDepartmentManager.id,
      ),
  );
  TestValidator.predicate(
    "Access token expired_at is ISO date-time string after join",
    typeof createdDepartmentManager.token.expired_at === "string" &&
      !isNaN(Date.parse(createdDepartmentManager.token.expired_at)),
  );
  TestValidator.predicate(
    "Refresh token refreshable_until is ISO date-time string after join",
    typeof createdDepartmentManager.token.refreshable_until === "string" &&
      !isNaN(Date.parse(createdDepartmentManager.token.refreshable_until)),
  );

  // 2. Login with correct email and password
  const loggedInDepartmentManager: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.login(connection, {
      body: {
        email: departmentManagerEmail,
        password: departmentManagerPassword,
      } satisfies IEnterpriseLmsDepartmentManager.ILogin,
    });
  typia.assert(loggedInDepartmentManager);

  // Validate user data matches
  TestValidator.equals(
    "Logged in department manager email matches created",
    loggedInDepartmentManager.email,
    departmentManagerEmail,
  );
  TestValidator.equals(
    "Logged in department manager ID matches created",
    loggedInDepartmentManager.id,
    createdDepartmentManager.id,
  );

  // Validate that JWT tokens are returned on login
  TestValidator.predicate(
    "JWT access token present after login",
    typeof loggedInDepartmentManager.token.access === "string" &&
      loggedInDepartmentManager.token.access.length > 0,
  );
  TestValidator.predicate(
    "JWT refresh token present after login",
    typeof loggedInDepartmentManager.token.refresh === "string" &&
      loggedInDepartmentManager.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "Access token expired_at is ISO date-time string after login",
    typeof loggedInDepartmentManager.token.expired_at === "string" &&
      !isNaN(Date.parse(loggedInDepartmentManager.token.expired_at)),
  );
  TestValidator.predicate(
    "Refresh token refreshable_until is ISO date-time string after login",
    typeof loggedInDepartmentManager.token.refreshable_until === "string" &&
      !isNaN(Date.parse(loggedInDepartmentManager.token.refreshable_until)),
  );

  // 3. Attempt login with incorrect password
  await TestValidator.error("Login fails with incorrect password", async () => {
    await api.functional.auth.departmentManager.login(connection, {
      body: {
        email: departmentManagerEmail,
        password: departmentManagerPassword + "wrong",
      } satisfies IEnterpriseLmsDepartmentManager.ILogin,
    });
  });

  // 4. Attempt login with non-existent email
  await TestValidator.error("Login fails with non-existent email", async () => {
    await api.functional.auth.departmentManager.login(connection, {
      body: {
        email: `nonexistent_${RandomGenerator.alphaNumeric(8)}@example.com`,
        password: departmentManagerPassword,
      } satisfies IEnterpriseLmsDepartmentManager.ILogin,
    });
  });
}
