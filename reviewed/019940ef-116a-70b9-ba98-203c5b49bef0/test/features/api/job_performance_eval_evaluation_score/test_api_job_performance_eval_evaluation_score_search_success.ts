import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEvaluationScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEvaluationScore";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIJobPerformanceEvalEvaluationScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalEvaluationScore";

/**
 * This test verifies that a manager can successfully search and retrieve a
 * paginated list of job performance evaluation scores.
 *
 * It includes the following steps:
 *
 * 1. Create a manager user via join API
 * 2. Login as the created manager user to establish authentication
 * 3. Use the authentication context to query evaluation scores with realistic
 *    filters (e.g., evaluation_id, score range)
 * 4. Verify the API response is a well-formed paginated list, with proper
 *    pagination info
 * 5. Verify each evaluation score record in the result set complies with the
 *    filter criteria
 * 6. Validate all responses using typia.assert for strong typing
 * 7. Use the dependencies correctly to ensure proper authorization role setup
 */
export async function test_api_job_performance_eval_evaluation_score_search_success(
  connection: api.IConnection,
) {
  // Step 1: Create a manager
  const managerCreateBody = {
    email: RandomGenerator.alphaNumeric(6) + "@company.com",
    password: "strongPa$$w0rd",
    name: RandomGenerator.name(2),
  } satisfies IJobPerformanceEvalManager.ICreate;

  const manager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: managerCreateBody,
    });
  typia.assert(manager);

  // Step 2: Login as the created manager
  const managerLoginBody = {
    email: managerCreateBody.email,
    password: "strongPa$$w0rd",
  } satisfies IJobPerformanceEvalManager.ILogin;

  const loggedInManager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.login(connection, {
      body: managerLoginBody,
    });
  typia.assert(loggedInManager);

  // Choice of evaluation_id filter - use actual manager id as evaluation_id for testing
  const evaluationIdFilter: string = manager.id;

  // Step 3: Query evaluation scores with filters
  const filterBody = {
    evaluation_id: evaluationIdFilter,
    min_score: 1,
    max_score: 5,
    page: 1,
    limit: 10,
    order_by: "score",
    order_direction: "desc",
  } satisfies IJobPerformanceEvalEvaluationScore.IRequest;

  const result: IPageIJobPerformanceEvalEvaluationScore =
    await api.functional.jobPerformanceEval.manager.evaluationScores.index(
      connection,
      { body: filterBody },
    );
  typia.assert(result);

  // Step 4: Validate pagination info
  TestValidator.predicate(
    "pagination current page is positive",
    result.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    result.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    result.pagination.pages >= 0,
  );

  // Step 5: Validate each evaluation score is within filter range and matches evaluation_id
  for (const scoreEntry of result.data) {
    typia.assert(scoreEntry);
    TestValidator.equals(
      "score evaluation_id matches filter",
      scoreEntry.evaluation_id,
      evaluationIdFilter,
    );
    TestValidator.predicate(
      "score value within min_score",
      scoreEntry.score >= 1,
    );
    TestValidator.predicate(
      "score value within max_score",
      scoreEntry.score <= 5,
    );
  }
}
