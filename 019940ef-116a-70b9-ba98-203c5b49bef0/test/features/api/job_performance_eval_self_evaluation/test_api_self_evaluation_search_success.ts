import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IJobPerformanceEvalSelfEvaluation } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalSelfEvaluation";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIJobPerformanceEvalSelfEvaluation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalSelfEvaluation";

/**
 * Test successful retrieval of paginated self-evaluation summaries by an
 * authorized manager.
 *
 * The test first creates and authenticates a manager user with realistic
 * details. Then it sends a search request to the self-evaluations endpoint with
 * valid filter and pagination parameters. It asserts the full correctness and
 * validity of the retrieved paginated summaries, including:
 *
 * - Proper pagination properties,
 * - Well-formed self-evaluation summary items,
 * - Correct and consistent data types,
 * - Non-error response.
 *
 * This test ensures that the manager can retrieve self-evaluation data as
 * expected without authorization or data integrity issues.
 */
export async function test_api_self_evaluation_search_success(
  connection: api.IConnection,
) {
  // 1. Manager user joins and authenticates
  const managerEmail = typia.random<string & tags.Format<"email">>();
  const managerName = RandomGenerator.name();
  const managerPassword = RandomGenerator.alphaNumeric(12);

  const manager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: {
        email: managerEmail,
        password: managerPassword,
        name: managerName,
      } satisfies IJobPerformanceEvalManager.ICreate,
    });
  typia.assert(manager);

  // 2. Search self-evaluations with filters and pagination
  // Provide realistic filter values with some explicitly null per schema
  const requestBody = {
    employee_id: null,
    evaluation_cycle_id: null,
    min_work_performance_score: null,
    max_work_performance_score: null,
    min_knowledge_skill_score: null,
    max_knowledge_skill_score: null,
    min_problem_solving_collab_score: null,
    max_problem_solving_collab_score: null,
    min_innovation_score: null,
    max_innovation_score: null,
    page: 1,
    limit: 20,
  } satisfies IJobPerformanceEvalSelfEvaluation.IRequest;

  const pageResult: IPageIJobPerformanceEvalSelfEvaluation.ISummary =
    await api.functional.jobPerformanceEval.manager.selfEvaluations.searchSelfEvaluations(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(pageResult);

  // 3. Validate pagination properties
  const pg = pageResult.pagination;
  TestValidator.predicate("pagination.current should be >= 1", pg.current >= 1);
  TestValidator.predicate("pagination.limit should be >= 1", pg.limit >= 1);
  TestValidator.predicate("pagination.records should be >= 0", pg.records >= 0);
  TestValidator.predicate("pagination.pages should be >= 0", pg.pages >= 0);
  TestValidator.predicate(
    "pagination.pages should be >= current",
    pg.pages >= pg.current,
  );

  // 4. Validate each self-evaluation summary item
  for (const summary of pageResult.data) {
    typia.assert(summary);
    TestValidator.predicate(
      "summary.work_performance_score in valid range",
      summary.work_performance_score >= 1 &&
        summary.work_performance_score <= 5,
    );
    TestValidator.predicate(
      "summary.knowledge_skill_score in valid range",
      summary.knowledge_skill_score >= 1 && summary.knowledge_skill_score <= 5,
    );
    TestValidator.predicate(
      "summary.problem_solving_collab_score in valid range",
      summary.problem_solving_collab_score >= 1 &&
        summary.problem_solving_collab_score <= 5,
    );
    TestValidator.predicate(
      "summary.innovation_score in valid range",
      summary.innovation_score >= 1 && summary.innovation_score <= 5,
    );
  }

  // 5. Validate data array is consistent with pagination records count
  TestValidator.predicate(
    "data length does not exceed pagination limit",
    pageResult.data.length <= pg.limit,
  );
}
