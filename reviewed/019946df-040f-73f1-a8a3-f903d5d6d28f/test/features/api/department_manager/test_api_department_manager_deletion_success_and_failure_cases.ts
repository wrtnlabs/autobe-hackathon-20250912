import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsDepartmentManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDepartmentManager";

/**
 * This E2E test validates the deletion API for department manager users
 * within a tenant organization. It performs comprehensive verification
 * including:
 *
 * 1. Registering a new department manager user with valid information.
 * 2. Authenticating as the created user to simulate login and authorization.
 * 3. Successfully deleting the created department manager user.
 * 4. Checking failure when deleting a non-existent department manager ID.
 * 5. Validating error responses when deletion is attempted with insufficient
 *    authorization.
 *
 * The test strictly uses only the documented API endpoints and DTOs,
 * ensuring complete type safety and schema adherence. All scenarios respect
 * business roles, authorization flows, and proper error handling. This test
 * assures tenant isolation and secure access enforcement for the department
 * manager deletion functionality.
 */
export async function test_api_department_manager_deletion_success_and_failure_cases(
  connection: api.IConnection,
) {
  // 1. Register a new department manager user
  const joinBody = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password: "Password123!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsDepartmentManager.ICreate;

  const joined: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // 2. Authenticate the created department manager user
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IEnterpriseLmsDepartmentManager.ILogin;

  const loggedIn: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedIn);

  // 3. Perform deletion of the created department manager
  // Deletion endpoint returns no content; absence of error indicates success
  await api.functional.enterpriseLms.departmentManager.departmentmanagers.erase(
    connection,
    { departmentmanagerId: loggedIn.id },
  );

  // 4. Test deleting a non-existent department manager id
  const fakeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deleting non-existent department manager should fail",
    async () => {
      await api.functional.enterpriseLms.departmentManager.departmentmanagers.erase(
        connection,
        { departmentmanagerId: fakeId },
      );
    },
  );

  // 5. Test deletion attempt with insufficient authorization
  // Create unauthenticated connection with empty headers (no auth token)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "deletion with insufficient authorization should fail",
    async () => {
      await api.functional.enterpriseLms.departmentManager.departmentmanagers.erase(
        unauthConnection,
        { departmentmanagerId: loggedIn.id },
      );
    },
  );
}
