import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEvaluationScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEvaluationScore";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IJobPerformanceEvalManagerEvaluation } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManagerEvaluation";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIJobPerformanceEvalEvaluationScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalEvaluationScore";

/**
 * This scenario tests the successful retrieval of a paginated and filtered list
 * of job performance evaluation scores by a manager user. It involves the
 * following steps:
 *
 * 1. Create a new manager account with proper email, password, and name.
 * 2. Login as the created manager to establish authentication context and receive
 *    JWT tokens.
 * 3. Using the manager's id, create at least one manager evaluation record that
 *    associates a specific evaluation cycle and employee with scoring details.
 * 4. Use the evaluation_id from the created manager evaluation to request a
 *    paginated list of evaluation scores, filtered by evaluation_id, one or two
 *    categories (e.g., 'work_performance' or 'knowledge_skill'), and by score
 *    ranges (e.g., minimum and maximum scores).
 * 5. Request pagination settings with page and limit, and include order_by and
 *    order_direction for sorting the resulting score list.
 * 6. Verify the paginated response structure includes valid pagination info and a
 *    list of evaluation score data matching the filtering criteria.
 * 7. Use typia.assert to check response types and TestValidator functions to
 *    validate correctness of the returned data.
 *
 * All API endpoints are accessed with authentication context handled by the
 * SDK's login process. The test excludes attempts to send invalid data or omit
 * required fields, focusing exclusively on a successful, valid request and
 * response cycle with accurate filtering and pagination.
 *
 * The scenario uses correct DTOs for each operation:
 * IJobPerformanceEvalManager.ICreate for manager join,
 * IJobPerformanceEvalManager.ILogin for login,
 * IJobPerformanceEvalManagerEvaluation.ICreate for manager evaluation creation,
 * and IJobPerformanceEvalEvaluationScore.IRequest for the evaluation scores
 * search request.
 */
export async function test_api_evaluation_scores_manager_search_success(
  connection: api.IConnection,
) {
  // 1. Create a manager user
  const createManagerBody = {
    email: `manager${Date.now()}@example.com`,
    password: "password1234",
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;
  const managerAuthorized: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: createManagerBody,
    });
  typia.assert(managerAuthorized);

  // 2. Login manager
  const loginBody = {
    email: createManagerBody.email,
    password: createManagerBody.password,
  } satisfies IJobPerformanceEvalManager.ILogin;
  const managerLoggedIn: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.login(connection, {
      body: loginBody,
    });
  typia.assert(managerLoggedIn);

  // 3. Create a manager evaluation
  const managerEvaluationBody = {
    manager_id: managerAuthorized.id,
    employee_id: typia.random<string & tags.Format<"uuid">>(),
    evaluation_cycle_id: typia.random<string & tags.Format<"uuid">>(),
    evaluation_date: new Date().toISOString(),
    work_performance_score: RandomGenerator.pick([1, 2, 3, 4, 5]),
    knowledge_skill_score: RandomGenerator.pick([1, 2, 3, 4, 5]),
    problem_solving_collab_score: RandomGenerator.pick([1, 2, 3, 4, 5]),
    innovation_score: RandomGenerator.pick([1, 2, 3, 4, 5]),
    overall_comment: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IJobPerformanceEvalManagerEvaluation.ICreate;
  const managerEvaluation: IJobPerformanceEvalManagerEvaluation =
    await api.functional.jobPerformanceEval.manager.managerEvaluations.create(
      connection,
      {
        body: managerEvaluationBody,
      },
    );
  typia.assert(managerEvaluation);

  // 4. Prepare evaluation scores search body
  const evaluationScoresSearchBody = {
    evaluation_id: managerEvaluation.id,
    category: RandomGenerator.pick([
      "work_performance",
      "knowledge_skill",
      "problem_solving_collab",
      "innovation",
    ]),
    min_score: 1,
    max_score: 5,
    page: 1,
    limit: 10,
    order_by: "score",
    order_direction: "desc" as "asc" | "desc",
  } satisfies IJobPerformanceEvalEvaluationScore.IRequest;

  // 5. Call evaluationScores.index with filter and pagination
  const evaluationScoresResponse: IPageIJobPerformanceEvalEvaluationScore =
    await api.functional.jobPerformanceEval.manager.evaluationScores.index(
      connection,
      {
        body: evaluationScoresSearchBody,
      },
    );
  typia.assert(evaluationScoresResponse);

  // 6. Validation of response
  TestValidator.predicate(
    "pagination current page should equal requested page",
    evaluationScoresResponse.pagination.current ===
      evaluationScoresSearchBody.page,
  );
  TestValidator.predicate(
    "pagination limit should equal requested limit",
    evaluationScoresResponse.pagination.limit ===
      evaluationScoresSearchBody.limit,
  );
  TestValidator.predicate(
    "all evaluation scores should have matching evaluation_id",
    evaluationScoresResponse.data.every(
      (score) =>
        score.evaluation_id === evaluationScoresSearchBody.evaluation_id,
    ),
  );
  TestValidator.predicate(
    "all evaluation scores should have category matching requested category",
    evaluationScoresResponse.data.every(
      (score) => score.category === evaluationScoresSearchBody.category,
    ),
  );
  TestValidator.predicate(
    "all evaluation scores scores should be between min_score and max_score",
    evaluationScoresResponse.data.every(
      (score) =>
        score.score >= (evaluationScoresSearchBody.min_score ?? 1) &&
        score.score <= (evaluationScoresSearchBody.max_score ?? 5),
    ),
  );

  // Check ordering desc by score
  for (let i = 1; i < evaluationScoresResponse.data.length; i++) {
    TestValidator.predicate(
      `score at position ${i - 1} >= score at position ${i}`,
      evaluationScoresResponse.data[i - 1].score >=
        evaluationScoresResponse.data[i].score,
    );
  }
}
