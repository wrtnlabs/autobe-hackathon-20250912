import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";

/**
 * This test case verifies the update operation on manager entity by an
 * authenticated employee user. An employee user is first created and logged in
 * to establish authentication context. Then, a simulated existing manager ID is
 * used to perform update on manager details. The test validates that the update
 * is successful and that the response reflects the updated data correctly.
 *
 * Steps:
 *
 * 1. Create an employee user and authenticate.
 * 2. Log in the employee user to ensure authentication context.
 * 3. Use a simulated manager ID for update.
 * 4. Update the manager using new email and name.
 * 5. Validate that the update reflects correctly.
 */
export async function test_api_manager_update_employee_role_success(
  connection: api.IConnection,
) {
  // 1. Create a new employee user and authenticate for employee role
  const employeeEmail: string = typia.random<string & tags.Format<"email">>();
  const employeePassword = "1234";
  const employeeJoinBody = {
    email: employeeEmail,
    password_hash: employeePassword,
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.ICreate;

  const employee: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: employeeJoinBody,
    });
  typia.assert(employee);

  // 2. Login again to ensure active employee authentication context
  const loginBody = {
    email: employeeEmail,
    password: employeePassword,
  } satisfies IJobPerformanceEvalEmployee.ILogin;

  const login: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.login.loginEmployee(connection, {
      body: loginBody,
    });
  typia.assert(login);

  // 3. Simulate an existing manager ID to update
  const existingManagerId = typia.random<string & tags.Format<"uuid">>();

  // 4. Prepare update body with new email and name
  const managerUpdateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.IUpdate;

  // 5. Update the manager
  const updatedManager: IJobPerformanceEvalManager =
    await api.functional.jobPerformanceEval.employee.managers.update(
      connection,
      {
        id: existingManagerId,
        body: managerUpdateBody,
      },
    );
  typia.assert(updatedManager);

  // 6. Validate update response
  TestValidator.equals(
    "updated manager id matches",
    updatedManager.id,
    existingManagerId,
  );
  TestValidator.equals(
    "updated manager email matches",
    updatedManager.email,
    managerUpdateBody.email,
  );
  TestValidator.equals(
    "updated manager name matches",
    updatedManager.name,
    managerUpdateBody.name,
  );
}
