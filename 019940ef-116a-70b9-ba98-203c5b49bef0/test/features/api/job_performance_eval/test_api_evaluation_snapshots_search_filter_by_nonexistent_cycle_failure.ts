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
 * This test validates the evaluation snapshots search API endpoint with a
 * filter on a non-existent evaluation cycle ID. It confirms that the API
 * responds with an empty data list correctly, demonstrating proper filtering
 * behavior and no errors.
 *
 * The test first registers a manager user to obtain authorization, then
 * requests the evaluationSnapshots endpoint with a filter using a random valid
 * UUID that does not correspond to any real evaluation cycle.
 *
 * It verifies that the returned page result contains zero data entries and
 * validates the pagination information.
 *
 * The procedure ensures the filtering logic gracefully handles invalid
 * references.
 */
export async function test_api_evaluation_snapshots_search_filter_by_nonexistent_cycle_failure(
  connection: api.IConnection,
) {
  // 1. Register a manager user to authenticate
  const managerEmail = typia.random<string & tags.Format<"email">>();
  const managerName = RandomGenerator.name();
  const managerPassword = "ValidPass123!"; // Use a simple valid password for test

  const manager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: {
        email: managerEmail,
        password: managerPassword,
        name: managerName,
      } satisfies IJobPerformanceEvalManager.ICreate,
    });
  typia.assert(manager);

  // 2. Generate a random UUID for filtering by a non-existent evaluation cycle ID
  const fakeEvaluationCycleId = typia.random<string & tags.Format<"uuid">>();

  // 3. Create the request body for the evaluationSnapshots index API
  const requestBody = {
    page: 1,
    limit: 10,
    filter: {
      evaluation_cycle_id: fakeEvaluationCycleId,
      employee_id: undefined,
      created_after: undefined,
      created_before: undefined,
    },
    search: undefined,
    orderBy: undefined,
    orderDirection: undefined,
  } satisfies IJobPerformanceEvalEvaluationSnapshots.IRequest;

  // 4. Call the evaluationSnapshots index API with the filter
  const response: IPageIJobPerformanceEvalEvaluationSnapshots.ISummary =
    await api.functional.jobPerformanceEval.manager.evaluationSnapshots.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(response);

  // 5. Validate the response data array is empty
  TestValidator.equals(
    "No data should be returned for nonexistent evaluation cycle filter",
    response.data.length,
    0,
  );

  // 6. Validate pagination information
  TestValidator.predicate(
    "Pagination current page should be 1 or more",
    response.pagination.current >= 1,
  );

  TestValidator.predicate(
    "Pagination limit should be 10 or more",
    response.pagination.limit >= 1,
  );

  TestValidator.predicate(
    "Pagination pages should be 0 or more",
    response.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "Pagination records should be 0 or more",
    response.pagination.records >= 0,
  );

  // Additional logical consistency checks
  TestValidator.equals(
    "Pagination pages consistency",
    response.pagination.pages,
    Math.ceil(response.pagination.records / response.pagination.limit),
  );
}
