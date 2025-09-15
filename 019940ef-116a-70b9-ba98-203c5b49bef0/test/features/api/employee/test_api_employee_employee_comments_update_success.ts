import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalEmployeeComments } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployeeComments";

/**
 * Tests the successful update of an existing employee comment by an
 * authenticated employee user.
 *
 * This test covers the full chain:
 *
 * 1. Register a new employee user for authentication context.
 * 2. Create a new employee comment using the authenticated user.
 * 3. Update the employee comment's qualitative comment content.
 *
 * Validates that updates to comment content are successful, that employee
 * and evaluation cycle IDs remain unchanged, and that the system respects
 * employee role authorization.
 */
export async function test_api_employee_employee_comments_update_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new employee user
  const employeeCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.ICreate;

  const employeeAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: employeeCreateBody,
    });
  typia.assert(employeeAuthorized);

  // 2. Create a new employee comment
  // Use the employee's ID from the authorized response
  const evaluationCycleId = typia.random<string & tags.Format<"uuid">>();

  const createCommentBody = {
    employee_id: employeeAuthorized.id,
    evaluation_cycle_id: evaluationCycleId,
    comment: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 2,
      sentenceMax: 4,
      wordMin: 5,
      wordMax: 9,
    }),
  } satisfies IJobPerformanceEvalEmployeeComments.ICreate;

  const createdComment =
    await api.functional.jobPerformanceEval.employee.employeeComments.create(
      connection,
      {
        body: createCommentBody,
      },
    );
  typia.assert(createdComment);

  // 3. Update the comment's content
  const updateCommentBody = {
    comment: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 5,
      wordMin: 4,
      wordMax: 7,
    }),
  } satisfies IJobPerformanceEvalEmployeeComments.IUpdate;

  const updatedComment =
    await api.functional.jobPerformanceEval.employee.employeeComments.updateEmployeeComment(
      connection,
      {
        id: typia.assert<string & tags.Format<"uuid">>(createdComment.id),
        body: updateCommentBody,
      },
    );
  typia.assert(updatedComment);

  // 4. Validate the update results
  TestValidator.notEquals(
    "comment text should be updated",
    createdComment.comment,
    updatedComment.comment,
  );
  TestValidator.equals(
    "updated comment matches update input",
    updatedComment.comment,
    updateCommentBody.comment,
  );
  TestValidator.equals(
    "employee_id unchanged",
    updatedComment.employee_id,
    createdComment.employee_id,
  );
  TestValidator.equals(
    "evaluation_cycle_id unchanged",
    updatedComment.evaluation_cycle_id,
    createdComment.evaluation_cycle_id,
  );
}
