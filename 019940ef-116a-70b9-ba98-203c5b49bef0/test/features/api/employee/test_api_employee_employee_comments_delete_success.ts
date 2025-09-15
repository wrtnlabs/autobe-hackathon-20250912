import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalEmployeeComments } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployeeComments";

/**
 * Test the successful deletion of an employee comment by an authenticated
 * employee.
 *
 * This test covers the full prerequisite flow including:
 *
 * 1. Registering a new employee user with unique email and password.
 * 2. Creating an employee comment associated with the new employee.
 * 3. Deleting the previously created employee comment.
 *
 * It validates that each step executes successfully and the deletion is
 * processed without errors, reflecting a realistic workflow for employee
 * comment management.
 */
export async function test_api_employee_employee_comments_delete_success(
  connection: api.IConnection,
) {
  // 1. Employee user registration and authentication
  const employeeCreateBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.ICreate;

  const employee: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: employeeCreateBody,
    });
  typia.assert(employee);

  // 2. Create a new employee comment associated with the authenticated employee
  const commentCreateBody = {
    employee_id: employee.id,
    evaluation_cycle_id: typia.random<string & tags.Format<"uuid">>(),
    comment: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 5,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IJobPerformanceEvalEmployeeComments.ICreate;

  const createdComment: IJobPerformanceEvalEmployeeComments =
    await api.functional.jobPerformanceEval.employee.employeeComments.create(
      connection,
      {
        body: commentCreateBody,
      },
    );
  typia.assert(createdComment);
  TestValidator.equals(
    "created comment's employee_id matches registered employee",
    createdComment.employee_id,
    employee.id,
  );

  // 3. Delete the created employee comment
  await api.functional.jobPerformanceEval.employee.employeeComments.eraseEmployeeComment(
    connection,
    {
      id: createdComment.id satisfies string & tags.Format<"uuid">,
    },
  );
}
