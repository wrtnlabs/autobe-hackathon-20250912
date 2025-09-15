import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEvaluationSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEvaluationSnapshots";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIJobPerformanceEvalEvaluationSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalEvaluationSnapshots";

/**
 * End-to-end test for successful search and pagination of job performance
 * evaluation snapshots.
 *
 * This scenario tests that a manager can authenticate and retrieve a
 * paginated list of evaluation snapshot summaries filtered by evaluation
 * cycle and employee IDs. It includes:
 *
 * - Manager user registration and authentication
 * - Extraction of valid filter values from generated data
 * - Search API invocation with filter and pagination parameters
 * - Validation of response structure and business logic
 */
export async function test_api_evaluation_snapshots_search_and_pagination_success(
  connection: api.IConnection,
) {
  // 1. Manager joins with valid credentials
  const managerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "strongpassword123",
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;

  const authorizedManager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: managerCreateBody,
    });
  typia.assert(authorizedManager);

  // 2. Obtain filter data from a random evaluation snapshot summary
  const sampleSnapshot: IJobPerformanceEvalEvaluationSnapshots.ISummary =
    typia.random<IJobPerformanceEvalEvaluationSnapshots.ISummary>();

  // 3. Prepare search request with filter and pagination
  const searchRequest = {
    page: 1,
    limit: 10,
    filter: {
      evaluation_cycle_id: sampleSnapshot.evaluation_cycle_id,
      employee_id: sampleSnapshot.employee_id,
    },
  } satisfies IJobPerformanceEvalEvaluationSnapshots.IRequest;

  // 4. Perform the search API call as manager
  const searchResult: IPageIJobPerformanceEvalEvaluationSnapshots.ISummary =
    await api.functional.jobPerformanceEval.manager.evaluationSnapshots.index(
      connection,
      { body: searchRequest },
    );

  // 5. Assert the response structure
  typia.assert(searchResult);

  // 6. Validate pagination metadata correctness
  const pagination: IPage.IPagination = searchResult.pagination;

  TestValidator.predicate(
    "pagination fields all non-negative",
    pagination.current >= 0 &&
      pagination.limit >= 0 &&
      pagination.records >= 0 &&
      pagination.pages >= 0,
  );

  TestValidator.predicate("page limit positive", pagination.limit > 0);

  TestValidator.predicate(
    "page number within range",
    pagination.pages === 0 || pagination.current <= pagination.pages,
  );

  TestValidator.predicate(
    "data list is array",
    Array.isArray(searchResult.data),
  );

  // 7. Validate each summarized evaluation snapshot
  for (const snapshot of searchResult.data) {
    typia.assert(snapshot);

    if (searchRequest.filter?.evaluation_cycle_id !== undefined) {
      TestValidator.equals(
        "evaluation_cycle_id matches filter",
        snapshot.evaluation_cycle_id,
        searchRequest.filter.evaluation_cycle_id,
      );
    }

    if (searchRequest.filter?.employee_id !== undefined) {
      TestValidator.equals(
        "employee_id matches filter",
        snapshot.employee_id,
        searchRequest.filter.employee_id,
      );
    }

    // Validate score ranges
    TestValidator.predicate(
      "performance_score in valid range",
      snapshot.performance_score >= 1 && snapshot.performance_score <= 5,
    );
    TestValidator.predicate(
      "knowledge_score in valid range",
      snapshot.knowledge_score >= 1 && snapshot.knowledge_score <= 5,
    );
    TestValidator.predicate(
      "problem_solving_score in valid range",
      snapshot.problem_solving_score >= 1 &&
        snapshot.problem_solving_score <= 5,
    );
    TestValidator.predicate(
      "innovation_score in valid range",
      snapshot.innovation_score >= 1 && snapshot.innovation_score <= 5,
    );

    // Optional manager scores must be null or in range
    if (
      snapshot.manager_performance_score !== null &&
      snapshot.manager_performance_score !== undefined
    ) {
      TestValidator.predicate(
        "manager_performance_score in valid range",
        snapshot.manager_performance_score >= 1 &&
          snapshot.manager_performance_score <= 5,
      );
    }
    if (
      snapshot.manager_knowledge_score !== null &&
      snapshot.manager_knowledge_score !== undefined
    ) {
      TestValidator.predicate(
        "manager_knowledge_score in valid range",
        snapshot.manager_knowledge_score >= 1 &&
          snapshot.manager_knowledge_score <= 5,
      );
    }
    if (
      snapshot.manager_problem_solving_score !== null &&
      snapshot.manager_problem_solving_score !== undefined
    ) {
      TestValidator.predicate(
        "manager_problem_solving_score in valid range",
        snapshot.manager_problem_solving_score >= 1 &&
          snapshot.manager_problem_solving_score <= 5,
      );
    }
    if (
      snapshot.manager_innovation_score !== null &&
      snapshot.manager_innovation_score !== undefined
    ) {
      TestValidator.predicate(
        "manager_innovation_score in valid range",
        snapshot.manager_innovation_score >= 1 &&
          snapshot.manager_innovation_score <= 5,
      );
    }

    // Validate timestamps are valid ISO 8601 strings
    typia.assert<string & tags.Format<"date-time">>(snapshot.created_at);
    typia.assert<string & tags.Format<"date-time">>(snapshot.updated_at);
  }
}
