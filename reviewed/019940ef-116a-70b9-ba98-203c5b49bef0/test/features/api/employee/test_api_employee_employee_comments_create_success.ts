import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalEmployeeComments } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployeeComments";

/**
 * Test for successful creation of an employee comment.
 *
 * The test performs the following steps:
 *
 * 1. Create a new employee user via the join API to establish an authenticated
 *    context.
 * 2. Use the returned employee ID to create a new employee comment linked to a
 *    realistic evaluation cycle ID.
 * 3. Assert that the returned comment matches expectations, including all
 *    required properties and proper associations.
 *
 * This test ensures that employee comments can be created by authenticated
 * employees and are stored with correct linkage and timestamps.
 */
export async function test_api_employee_employee_comments_create_success(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a new employee
  const employeeCreateBody = {
    email: `employee${RandomGenerator.alphaNumeric(5)}@company.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.ICreate;

  const employee: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: employeeCreateBody,
    });
  typia.assert(employee);

  // 2. Prepare employee comment creation body with linked employee ID and evaluation cycle ID
  // For evaluation_cycle_id, generate a realistic UUID
  const evaluationCycleId = typia.random<string & tags.Format<"uuid">>();
  const commentContent = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 10,
  });

  const commentCreateBody = {
    employee_id: employee.id,
    evaluation_cycle_id: evaluationCycleId,
    comment: commentContent,
  } satisfies IJobPerformanceEvalEmployeeComments.ICreate;

  // 3. Create the employee comment by calling the create API
  const createdComment: IJobPerformanceEvalEmployeeComments =
    await api.functional.jobPerformanceEval.employee.employeeComments.create(
      connection,
      {
        body: commentCreateBody,
      },
    );
  typia.assert(createdComment);

  // 4. Validate the returned employee comment fields
  TestValidator.equals(
    "employee_id matches",
    createdComment.employee_id,
    employee.id,
  );
  TestValidator.equals(
    "evaluation_cycle_id matches",
    createdComment.evaluation_cycle_id,
    evaluationCycleId,
  );
  TestValidator.equals(
    "comment matches",
    createdComment.comment,
    commentContent,
  );

  // Validate that id is a non-empty string
  TestValidator.predicate(
    "id is non-empty string",
    typeof createdComment.id === "string" && createdComment.id.length > 0,
  );

  // Validate created_at and updated_at are ISO date-time strings and non-empty
  TestValidator.predicate(
    "created_at is ISO date-time string",
    typeof createdComment.created_at === "string" &&
      createdComment.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is ISO date-time string",
    typeof createdComment.updated_at === "string" &&
      createdComment.updated_at.length > 0,
  );
}
