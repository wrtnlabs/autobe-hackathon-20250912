import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";

/**
 * Test the successful deletion of a manager by an employee with proper
 * authorization.
 *
 * This test performs the following steps:
 *
 * 1. Creates a manager user with a valid email, plaintext password, and name.
 * 2. Creates an employee user with a valid email, hashed password, and name.
 * 3. Authenticates as the employee user with login credentials.
 * 4. Deletes the created manager using the employee's authorization.
 * 5. Verifies successful deletion responds with no content.
 *
 * The test ensures correct role-based access control, API contract adherence,
 * and successful business workflow execution.
 *
 * @param connection API connection for making authenticated requests.
 */
export async function test_api_manager_erase_employee_manager_by_id_success(
  connection: api.IConnection,
) {
  // 1. Create manager user
  const managerJoinBody = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password: "TestPassword123!",
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;
  const manager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: managerJoinBody,
    });
  typia.assert(manager);

  // 2. Create employee user
  const plaintextEmployeePassword = RandomGenerator.alphaNumeric(20);
  const employeeJoinBody = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password_hash: plaintextEmployeePassword,
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.ICreate;
  const employee: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: employeeJoinBody,
    });
  typia.assert(employee);

  // 3. Login as employee user using the plaintext password
  const employeeLoginBody = {
    email: employeeJoinBody.email,
    password: plaintextEmployeePassword,
  } satisfies IJobPerformanceEvalEmployee.ILogin;
  const employeeLogin: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.login.loginEmployee(connection, {
      body: employeeLoginBody,
    });
  typia.assert(employeeLogin);

  // 4. Employee deletes manager by ID
  await api.functional.jobPerformanceEval.employee.managers.erase(connection, {
    id: manager.id,
  });
}
