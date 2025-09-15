import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalSelfEvaluation } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalSelfEvaluation";

/**
 * Validate updating an existing employee's self-evaluation successfully.
 *
 * This test first creates and authenticates a new employee user via
 * /auth/employee/join endpoint, establishing the authorization context.
 * Then, it simulates having an existing self-evaluation record by
 * generating a dummy ID. It proceeds to update the self-evaluation record's
 * fields including evaluation date, scores, and overall comment via the PUT
 * endpoint, validating that the updated fields are correctly applied.
 *
 * The test verifies authorization, input-output schema compliance, and
 * correct business logic flow for self-evaluation updates.
 *
 * All API responses are fully asserted for type correctness.
 */
export async function test_api_employee_self_evaluation_update_success_with_authentication(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a new employee to obtain authorization tokens.
  const employeeCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.ICreate;
  const employee: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: employeeCreateBody,
    });
  typia.assert(employee);

  // 2. Simulate an existing self-evaluation record ID for update.
  const existingSelfEvaluationId = typia.random<string & tags.Format<"uuid">>();

  // 3. Prepare update body with realistic values.
  const updateBody: IJobPerformanceEvalSelfEvaluation.IUpdate = {
    evaluation_date: new Date(new Date().getTime() + 86400000).toISOString(), // next day
    work_performance_score:
      (RandomGenerator.alphaNumeric(1).charCodeAt(0) % 5) + 1,
    knowledge_skill_score:
      (RandomGenerator.alphaNumeric(1).charCodeAt(0) % 5) + 1,
    problem_solving_collab_score:
      (RandomGenerator.alphaNumeric(1).charCodeAt(0) % 5) + 1,
    innovation_score: (RandomGenerator.alphaNumeric(1).charCodeAt(0) % 5) + 1,
    overall_comment: RandomGenerator.paragraph({ sentences: 10 }),
  };

  // 4. Call update API to modify the self-evaluation.
  const updatedSelfEvaluation: IJobPerformanceEvalSelfEvaluation =
    await api.functional.jobPerformanceEval.employee.selfEvaluations.update(
      connection,
      {
        id: existingSelfEvaluationId,
        body: updateBody,
      },
    );
  typia.assert(updatedSelfEvaluation);

  // 5. Validate updated fields match the update body.
  TestValidator.equals(
    "Updated evaluation_date matches",
    updatedSelfEvaluation.evaluation_date,
    updateBody.evaluation_date,
  );
  TestValidator.equals(
    "Updated work_performance_score matches",
    updatedSelfEvaluation.work_performance_score,
    updateBody.work_performance_score,
  );
  TestValidator.equals(
    "Updated knowledge_skill_score matches",
    updatedSelfEvaluation.knowledge_skill_score,
    updateBody.knowledge_skill_score,
  );
  TestValidator.equals(
    "Updated problem_solving_collab_score matches",
    updatedSelfEvaluation.problem_solving_collab_score,
    updateBody.problem_solving_collab_score,
  );
  TestValidator.equals(
    "Updated innovation_score matches",
    updatedSelfEvaluation.innovation_score,
    updateBody.innovation_score,
  );
  TestValidator.equals(
    "Updated overall_comment matches",
    updatedSelfEvaluation.overall_comment,
    updateBody.overall_comment,
  );

  // 6. Confirm employee_id remains the same.
  TestValidator.equals(
    "employee_id remains unchanged",
    updatedSelfEvaluation.employee_id,
    employee.id,
  );
}
