import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalManager";

/**
 * End-to-end test verifying paginated retrieval of managers with search and
 * sorting.
 *
 * This test ensures the manager role authentication is established by
 * calling the join API twice as dependencies before proceeding.
 *
 * It conducts a search for manager names using a random substring,
 * requesting the first page with 5 results, sorted ascending by name.
 *
 * Validations include:
 *
 * - Confirming pagination metadata correctness
 * - Ensuring each returned manager matches the search criteria in the name
 *   (case-insensitive)
 * - Verifying the list is sorted in ascending order by manager name
 * - Checking all returned summaries have valid UUID format IDs and non-empty
 *   names
 * - Using typia.assert to perform full runtime response validation
 * - Using descriptive TestValidator checks for all assertions
 *
 * This comprehensive flow validates the complete data filtering, paging,
 * and sorting logic for manager listings as authorized by the manager
 * role.
 */
export async function test_api_manager_index_with_search_and_pagination(
  connection: api.IConnection,
) {
  // Step 1: Authenticate manager by calling join endpoint twice
  const managerCreateBody1 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPassword123!",
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;
  const manager1 = await api.functional.auth.manager.join(connection, {
    body: managerCreateBody1,
  });
  typia.assert(manager1);

  const managerCreateBody2 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPassword123!",
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;
  const manager2 = await api.functional.auth.manager.join(connection, {
    body: managerCreateBody2,
  });
  typia.assert(manager2);

  // Step 2: Prepare a search term substring from one of the registered manager names
  const searchTerm = manager2.name.slice(0, 3).toLowerCase();

  // Step 3: Request first page with limit 5, search filter, and sort ascending by name
  const requestBody = {
    search: searchTerm,
    page: 1,
    limit: 5,
    sort: "name_asc",
  } satisfies IJobPerformanceEvalManager.IRequest;

  const response =
    await api.functional.jobPerformanceEval.manager.managers.index(connection, {
      body: requestBody,
    });

  // Step 4: Validate response structure
  typia.assert(response);

  // Step 5: Validate pagination metadata
  TestValidator.equals(
    "pagination current page should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 5",
    response.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "pagination total records should be non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination total pages should be at least 1",
    response.pagination.pages >= 1,
  );

  // Step 6: Validate each manager summary entry
  for (const managerSummary of response.data) {
    // Verify id matches UUID regex pattern
    TestValidator.predicate(
      `manager id ${managerSummary.id} should be a valid UUID`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        managerSummary.id,
      ),
    );

    // Verify name contains the search term (case-insensitive)
    TestValidator.predicate(
      `manager name ${managerSummary.name} should include search term`,
      managerSummary.name.toLowerCase().includes(searchTerm),
    );
  }

  // Step 7: Validate that data is sorted ascending by name
  for (let i = 1; i < response.data.length; i++) {
    TestValidator.predicate(
      `response data is sorted ascending by name at index ${i}`,
      response.data[i - 1].name.localeCompare(response.data[i].name) <= 0,
    );
  }
}
