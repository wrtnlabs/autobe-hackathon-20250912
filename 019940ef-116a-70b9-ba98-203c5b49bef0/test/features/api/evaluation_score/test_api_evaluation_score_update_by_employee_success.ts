import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalEvaluationScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEvaluationScore";
import type { IJobPerformanceEvalSelfEvaluation } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalSelfEvaluation";

/**
 * This E2E test validates the update operation of an evaluation score
 * record by an employee user.
 *
 * Steps:
 *
 * 1. Employee user signs up and authenticates (post /auth/employee/join).
 * 2. Employee creates a self-evaluation record (post
 *    /jobPerformanceEval/employee/selfEvaluations).
 * 3. Employee creates an initial evaluation score record linked to the
 *    self-evaluation.
 * 4. Employee updates the evaluation score record by its ID with new category
 *    and score.
 * 5. Validate the updated data is correctly returned.
 *
 * This test ensures the update API enforces authorization and maintains
 * data consistency.
 */
export async function test_api_evaluation_score_update_by_employee_success(
  connection: api.IConnection,
) {
  // 1. Employee user signs up and authenticates
  const email = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const passwordHash = RandomGenerator.alphaNumeric(16); // representing hashed pwd
  const name = RandomGenerator.name();

  const employee = await api.functional.auth.employee.join.joinEmployee(
    connection,
    {
      body: {
        email,
        password_hash: passwordHash,
        name,
      } satisfies IJobPerformanceEvalEmployee.ICreate,
    },
  );
  typia.assert(employee);

  // 2. Create self-evaluation record
  // Prepare self evaluation creation body with random but valid data
  const nowIso = new Date().toISOString();

  // Assuming that employee can create self-eval with random evaluation_cycle_id
  // since no API for cycles, we'll generate a random UUID for it
  const evaluationCycleId = typia.random<string & tags.Format<"uuid">>();

  const selfEvaluationCreateBody = {
    evaluation_cycle_id: evaluationCycleId,
    evaluation_date: nowIso,
    work_performance_score: 3,
    knowledge_skill_score: 4,
    problem_solving_collab_score: 3,
    innovation_score: 5,
    overall_comment: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IJobPerformanceEvalSelfEvaluation.ICreate;

  const selfEvaluation =
    await api.functional.jobPerformanceEval.employee.selfEvaluations.create(
      connection,
      {
        body: selfEvaluationCreateBody,
      },
    );
  typia.assert(selfEvaluation);

  // 3. Create initial evaluation score linked to selfEvaluation
  const evalScoreCreateBody = {
    evaluation_id: selfEvaluation.id,
    category: "work_performance",
    score: 3,
  } satisfies IJobPerformanceEvalEvaluationScore.ICreate;

  const initialEvaluationScore =
    await api.functional.jobPerformanceEval.employee.evaluationScores.create(
      connection,
      {
        body: evalScoreCreateBody,
      },
    );
  typia.assert(initialEvaluationScore);

  // 4. Update the evaluation score record by id
  const updateBody = {
    category: "knowledge_skill",
    score: 4,
  } satisfies IJobPerformanceEvalEvaluationScore.IUpdate;

  const updatedEvaluationScore =
    await api.functional.jobPerformanceEval.employee.evaluationScores.update(
      connection,
      {
        id: initialEvaluationScore.id,
        body: updateBody,
      },
    );
  typia.assert(updatedEvaluationScore);

  // 5. Validate updated data
  TestValidator.equals(
    "updated evaluation score id equals initial id",
    updatedEvaluationScore.id,
    initialEvaluationScore.id,
  );
  TestValidator.equals(
    "updated evaluation score category",
    updatedEvaluationScore.category,
    updateBody.category,
  );
  TestValidator.equals(
    "updated evaluation score value",
    updatedEvaluationScore.score,
    updateBody.score,
  );
  TestValidator.equals(
    "evaluation id remains unchanged",
    updatedEvaluationScore.evaluation_id,
    selfEvaluation.id,
  );
}
