import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalEvaluationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEvaluationSnapshot";
import type { IJobPerformanceEvalSelfEvaluation } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalSelfEvaluation";

/**
 * Test retrieving a job performance evaluation snapshot by ID as an
 * employee user.
 *
 * This test performs the following workflow:
 *
 * 1. Creates a new employee user using the join API to authenticate as an
 *    employee.
 * 2. Creates a self-evaluation for the employee which simulates submission of
 *    evaluation scores and comments.
 * 3. Retrieves the evaluation snapshot by the ID associated with the created
 *    self-evaluation.
 * 4. Validates that the retrieved snapshot data matches expected employee
 *    information and score ranges.
 * 5. Validates that access to an invalid or unauthorized snapshot ID results
 *    in an error.
 *
 * This ensures that only authenticated employees can retrieve their
 * evaluation snapshots, validates data integrity, and tests error handling
 * when accessing invalid IDs.
 *
 * All required fields and constraints are respected, including UUID
 * formats, date-time formats, and integer score ranges. Proper use of
 * authentication tokens is handled by the SDK.
 */
export async function test_api_evaluation_snapshot_get_employee_success_and_failure(
  connection: api.IConnection,
) {
  // 1. Employee user joins and authenticates
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const employeeCreateBody = {
    email: employeeEmail,
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.ICreate;

  // Create the employee user and get authorized response
  const employee: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: employeeCreateBody,
    });
  typia.assert(employee);

  // 2. Employee creates a self evaluation
  const evaluationCycleId = typia.random<string & tags.Format<"uuid">>();
  const evaluationDate = new Date().toISOString();
  const selfEvaluationCreateBody = {
    evaluation_cycle_id: evaluationCycleId,
    evaluation_date: evaluationDate,
    work_performance_score: RandomGenerator.pick([1, 2, 3, 4, 5] as const),
    knowledge_skill_score: RandomGenerator.pick([1, 2, 3, 4, 5] as const),
    problem_solving_collab_score: RandomGenerator.pick([
      1, 2, 3, 4, 5,
    ] as const),
    innovation_score: RandomGenerator.pick([1, 2, 3, 4, 5] as const),
    overall_comment: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IJobPerformanceEvalSelfEvaluation.ICreate;

  const selfEvaluation: IJobPerformanceEvalSelfEvaluation =
    await api.functional.jobPerformanceEval.employee.selfEvaluations.create(
      connection,
      {
        body: selfEvaluationCreateBody,
      },
    );
  typia.assert(selfEvaluation);

  // 3. Retrieve the evaluation snapshot by ID
  // Use the created selfEvaluation's id for retrieving snapshot
  const snapshotId = selfEvaluation.id;

  const snapshot: IJobPerformanceEvalEvaluationSnapshot =
    await api.functional.jobPerformanceEval.employee.evaluationSnapshots.at(
      connection,
      { id: snapshotId },
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "evaluation snapshot id equals to created selfEvaluation id",
    snapshot.id,
    snapshotId,
  );
  TestValidator.equals(
    "evaluation snapshot belongs to correct employee id",
    snapshot.employee_id,
    employee.id,
  );
  TestValidator.predicate(
    "evaluation scores are integers between 1 and 5",
    snapshot.performance_score >= 1 &&
      snapshot.performance_score <= 5 &&
      snapshot.knowledge_score >= 1 &&
      snapshot.knowledge_score <= 5 &&
      snapshot.problem_solving_score >= 1 &&
      snapshot.problem_solving_score <= 5 &&
      snapshot.innovation_score >= 1 &&
      snapshot.innovation_score <= 5,
  );

  // 4. Failure test: try accessing evaluation snapshot with invalid or unauthorized id
  const invalidId = typia.random<string & tags.Format<"uuid">>();
  // Use a different random UUID as invalid snapshot id
  await TestValidator.error(
    "accessing evaluation snapshot with invalid ID should fail",
    async () => {
      await api.functional.jobPerformanceEval.employee.evaluationSnapshots.at(
        connection,
        { id: invalidId },
      );
    },
  );
}
