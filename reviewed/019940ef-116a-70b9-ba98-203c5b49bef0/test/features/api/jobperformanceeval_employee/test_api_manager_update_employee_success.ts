import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";

/**
 * Test scenario for updating an employee by a manager user.
 *
 * 1. Manager authentication via /auth/manager/join to obtain manager
 *    authorization.
 * 2. Employee creation via /auth/employee/join to obtain employeeId.
 * 3. Perform PUT /jobPerformanceEval/manager/employees/{employeeId} to update
 *    the employee.
 * 4. Assert the updated fields match the update input.
 * 5. Validate types and response correctness.
 */
export async function test_api_manager_update_employee_success(
  connection: api.IConnection,
) {
  // 1. Manager user joins and authenticates
  const managerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "validPassword123",
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;
  const manager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, { body: managerBody });
  typia.assert(manager);

  // 2. Employee user joins
  const employeeBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: "hashedPasswordPlaceholder",
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.ICreate;
  const employee: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: employeeBody,
    });
  typia.assert(employee);

  // 3. Prepare update data
  const updateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: "updatedHashedNewPassword",
    name: RandomGenerator.name(),
    deleted_at: null,
  } satisfies IJobPerformanceEvalEmployee.IUpdate;

  // 4. Perform update
  const updatedEmployee: IJobPerformanceEvalEmployee =
    await api.functional.jobPerformanceEval.manager.employees.update(
      connection,
      {
        id: employee.id,
        body: updateBody,
      },
    );
  typia.assert(updatedEmployee);

  // 5. Verify the updated fields
  TestValidator.equals(
    "employee updated email matches",
    updatedEmployee.email,
    updateBody.email,
  );
  TestValidator.equals(
    "employee updated password_hash matches",
    updatedEmployee.password_hash,
    updateBody.password_hash,
  );
  TestValidator.equals(
    "employee updated name matches",
    updatedEmployee.name,
    updateBody.name,
  );
  TestValidator.equals(
    "employee deleted_at is null",
    updatedEmployee.deleted_at,
    null,
  );
}
