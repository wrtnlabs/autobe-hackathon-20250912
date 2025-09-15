import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalEmployeeComments } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployeeComments";

/**
 * Test the creation of an employee comment without authentication.
 *
 * This test simulates the attempt to create a comment on the employee
 * performance evaluation system while the user context lacks the required
 * employee authentication credentials.
 *
 * Preconditions:
 *
 * - Do NOT perform the employee join (authentication) operation.
 *
 * Test Steps:
 *
 * 1. Attempt to create an employee comment with realistically valid data for
 *    `employee_id`, `evaluation_cycle_id`, and `comment`.
 * 2. Verify that the operation fails due to unauthorized access.
 *
 * Validation:
 *
 * - The API call should reject with an error indicating lack of proper
 *   authorization.
 * - Use TestValidator.error with a descriptive title to confirm the
 *   authorization failure.
 */
export async function test_api_employee_employee_comments_create_unauthorized(
  connection: api.IConnection,
) {
  // Prepare an employee comment creation request body with valid UUIDs and a comment string
  const requestBody = {
    employee_id: typia.random<string & tags.Format<"uuid">>(),
    evaluation_cycle_id: typia.random<string & tags.Format<"uuid">>(),
    comment: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IJobPerformanceEvalEmployeeComments.ICreate;

  // Attempt to create the employee comment without prior employee authentication
  // Expect an authorization error
  await TestValidator.error(
    "attempting to create employee comment without authentication should fail",
    async () => {
      await api.functional.jobPerformanceEval.employee.employeeComments.create(
        connection,
        {
          body: requestBody,
        },
      );
    },
  );
}
