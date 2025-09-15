import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEvaluationScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEvaluationScore";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";

/**
 * Test successful retrieval of job performance evaluation score details for
 * a manager user.
 *
 * This test executes the full flow:
 *
 * 1. Create a manager user (join) with valid email, password, and name.
 * 2. Authenticate the manager user (login) to get access tokens.
 * 3. Attempt to get job performance evaluation score details by a random valid
 *    UUID ID.
 * 4. Validate the evaluation score details - ensure the ID matches and all
 *    properties are present and correctly typed.
 *
 * This test simulates a manager's authorized access to evaluation score
 * details, verifying authentication and authorization mechanisms along with
 * data accuracy.
 */
export async function test_api_job_performance_eval_evaluation_score_detail_success_manager_role(
  connection: api.IConnection,
) {
  // Generate a random manager account data
  const managerCreateBody = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;

  // 1. Register (join) manager user
  const managerAuthorized: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: managerCreateBody,
    });
  typia.assert(managerAuthorized);

  // 2. Login as the manager user to authenticate
  const managerLoginBody = {
    email: managerCreateBody.email,
    password: managerCreateBody.password,
  } satisfies IJobPerformanceEvalManager.ILogin;

  const managerLoggedIn: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.login(connection, {
      body: managerLoginBody,
    });
  typia.assert(managerLoggedIn);

  // 3. Retrieve evaluation score details by ID
  const evaluationScoreId = typia.random<string & tags.Format<"uuid">>();

  const evaluationScore: IJobPerformanceEvalEvaluationScore =
    await api.functional.jobPerformanceEval.manager.evaluationScores.at(
      connection,
      {
        id: evaluationScoreId,
      },
    );
  typia.assert(evaluationScore);

  // 4. Validate evaluation score properties
  TestValidator.equals(
    "evaluation score ID should match requested ID",
    evaluationScore.id,
    evaluationScoreId,
  );
  TestValidator.predicate(
    "evaluation score has valid evaluation_id",
    typeof evaluationScore.evaluation_id === "string" &&
      evaluationScore.evaluation_id.length > 0,
  );
  TestValidator.predicate(
    "evaluation score has valid category",
    typeof evaluationScore.category === "string" &&
      evaluationScore.category.length > 0,
  );
  TestValidator.predicate(
    "evaluation score's score is integer between 1 and 5 inclusive",
    Number.isInteger(evaluationScore.score) &&
      evaluationScore.score >= 1 &&
      evaluationScore.score <= 5,
  );
  TestValidator.predicate(
    "evaluation score has created_at proper string",
    typeof evaluationScore.created_at === "string" &&
      evaluationScore.created_at.length > 0,
  );
  TestValidator.predicate(
    "evaluation score has updated_at proper string",
    typeof evaluationScore.updated_at === "string" &&
      evaluationScore.updated_at.length > 0,
  );
}
