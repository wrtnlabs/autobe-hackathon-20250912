import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalEvaluationScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEvaluationScore";
import type { IJobPerformanceEvalSelfEvaluation } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalSelfEvaluation";

/**
 * E2E test covering deletion of evaluation scores with employee authentication.
 *
 * Workflow:
 *
 * 1. Join first employee (create and authenticate)
 * 2. Create self-evaluation to get evaluation ID
 * 3. Create evaluation score tied to the self-evaluation
 * 4. Delete the evaluation score successfully
 * 5. Attempt deletion again and expect failure
 * 6. Join second employee
 * 7. Attempt to delete first employee's evaluation score with second employee and
 *    expect authorization failure
 */
export async function test_api_evaluation_score_delete_employee_valid_and_invalid_cases(
  connection: api.IConnection,
) {
  // 1. Register first employee user and authenticate
  const employee1Email: string = typia.random<string & tags.Format<"email">>();
  const employee1PasswordHash: string = RandomGenerator.alphaNumeric(32);
  const employee1: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: {
        email: employee1Email,
        password_hash: employee1PasswordHash,
        name: RandomGenerator.name(),
      } satisfies IJobPerformanceEvalEmployee.ICreate,
    });
  typia.assert(employee1);

  // 2. Create a self-evaluation associated with employee1
  const evaluationCycleId: string = typia.random<
    string & tags.Format<"uuid">
  >(); // Simulated evaluation cycle
  const selfEvalCreateBody = {
    evaluation_cycle_id: evaluationCycleId,
    evaluation_date: new Date().toISOString(),
    work_performance_score: RandomGenerator.pick([1, 2, 3, 4, 5]),
    knowledge_skill_score: RandomGenerator.pick([1, 2, 3, 4, 5]),
    problem_solving_collab_score: RandomGenerator.pick([1, 2, 3, 4, 5]),
    innovation_score: RandomGenerator.pick([1, 2, 3, 4, 5]),
    overall_comment: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IJobPerformanceEvalSelfEvaluation.ICreate;

  const selfEvaluation: IJobPerformanceEvalSelfEvaluation =
    await api.functional.jobPerformanceEval.employee.selfEvaluations.create(
      connection,
      { body: selfEvalCreateBody },
    );
  typia.assert(selfEvaluation);

  // 3. Create evaluation score for the self-evaluation
  const evalScoreCreateBody = {
    evaluation_id: selfEvaluation.id,
    category: RandomGenerator.pick([
      "work_performance",
      "knowledge_skill",
      "problem_solving_collab",
      "innovation",
    ]),
    score: RandomGenerator.pick([1, 2, 3, 4, 5]),
  } satisfies IJobPerformanceEvalEvaluationScore.ICreate;

  const evaluationScore: IJobPerformanceEvalEvaluationScore =
    await api.functional.jobPerformanceEval.employee.evaluationScores.create(
      connection,
      { body: evalScoreCreateBody },
    );
  typia.assert(evaluationScore);

  // 4. Delete the created evaluation score
  await api.functional.jobPerformanceEval.employee.evaluationScores.erase(
    connection,
    { id: evaluationScore.id },
  );

  // 5. Attempt to delete the same evaluation score again,
  // expecting failure since it no longer exists
  await TestValidator.error(
    "deletion of non-existent evaluation score should fail",
    async () => {
      await api.functional.jobPerformanceEval.employee.evaluationScores.erase(
        connection,
        { id: evaluationScore.id },
      );
    },
  );

  // 6. Register second employee user and authenticate
  const employee2Email: string = typia.random<string & tags.Format<"email">>();
  const employee2PasswordHash: string = RandomGenerator.alphaNumeric(32);
  const employee2: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: {
        email: employee2Email,
        password_hash: employee2PasswordHash,
        name: RandomGenerator.name(),
      } satisfies IJobPerformanceEvalEmployee.ICreate,
    });
  typia.assert(employee2);

  // 7. Attempt deletion of the first evaluation score with second employee,
  // expecting authorization error
  await TestValidator.error(
    "second employee cannot delete first employee's evaluation score",
    async () => {
      await api.functional.jobPerformanceEval.employee.evaluationScores.erase(
        connection,
        { id: evaluationScore.id },
      );
    },
  );
}
