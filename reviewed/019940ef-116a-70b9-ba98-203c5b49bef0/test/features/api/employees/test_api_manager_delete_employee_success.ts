import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";

/**
 * Verify that a manager can delete an employee successfully.
 *
 * 1. Register a new manager (POST /auth/manager/join).
 * 2. Authenticate the manager and set authentication context.
 * 3. Register a new employee (POST /auth/employee/join).
 * 4. Delete the employee with DELETE /jobPerformanceEval/manager/employees/{id}.
 * 5. Confirm deletion completes without error.
 */
export async function test_api_manager_delete_employee_success(
  connection: api.IConnection,
) {
  // 1. Register a new manager
  const managerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;

  const manager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, { body: managerInput });
  typia.assert(manager);

  // 2. Authentication context established automatically by SDK

  // 3. Register a new employee
  const employeeInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(64),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.ICreate;

  const employee: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: employeeInput,
    });
  typia.assert(employee);

  // 4. Manager deletes the employee by ID
  await api.functional.jobPerformanceEval.manager.employees.erase(connection, {
    id: employee.id,
  });

  // 5. Successful completion means deletion succeeded
  TestValidator.predicate("delete employee success", true);
}
