import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalEmployeeComments } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployeeComments";

/**
 * Test unauthorized access to retrieve employee comments.
 *
 * This test first performs the necessary join operation to establish
 * employee accounts for the business context but then attempts to retrieve
 * an employee comment by ID without authentication, expecting access
 * rejection.
 *
 * Steps:
 *
 * 1. Perform employee join operation to set prerequisite context.
 * 2. Create an unauthenticated connection (empty headers).
 * 3. Attempt to get employee comment details using the unauthenticated
 *    connection.
 * 4. Confirm unauthorized access error is thrown.
 */
export async function test_api_employee_employee_comments_get_unauthorized(
  connection: api.IConnection,
) {
  // 1. Join a new employee to fulfill prerequisite
  const employeeCreateBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.ICreate;
  const employee: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: employeeCreateBody,
    });
  typia.assert(employee);

  // 2. Create an unauthorized connection variant (empty headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 3. Attempt to get employee comment details without authentication
  await TestValidator.error(
    "Access without authentication should throw error",
    async () => {
      await api.functional.jobPerformanceEval.employee.employeeComments.at(
        unauthConn,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
