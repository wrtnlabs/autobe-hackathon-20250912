import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalManager";

/**
 * End-to-end test for PATCH /jobPerformanceEval/manager/managers.
 *
 * This test covers:
 *
 * - Manager account creation and authentication via /auth/manager/join
 * - Querying the managers list with valid filters
 * - Verifying that the newly created manager appears in the list
 * - Verifying that search with non-existent manager name returns empty
 *   results
 *
 * All API calls are awaited and responses validated using typia.assert.
 * Validation of business logic uses TestValidator with descriptive titles.
 */
export async function test_api_manager_at_valid_and_not_found(
  connection: api.IConnection,
) {
  // 1. Manager Authentication (join)
  const email: string = typia.random<string & tags.Format<"email">>();
  const password = "Password123!";
  const name = RandomGenerator.name(2);

  // Join to create and authenticate a manager
  const authorizedManager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: {
        email: email,
        password: password,
        name: name,
      } satisfies IJobPerformanceEvalManager.ICreate,
    });
  typia.assert(authorizedManager);

  // 2. Prepare request for the patch endpoint to search manager by name
  const validRequest: IJobPerformanceEvalManager.IRequest = {
    search: name,
    page: 1,
    limit: 10,
    sort: "name_asc",
  };

  // Fetch the list of managers with valid request
  const pageSummary: IPageIJobPerformanceEvalManager.ISummary =
    await api.functional.jobPerformanceEval.manager.managers.index(connection, {
      body: validRequest,
    });
  typia.assert(pageSummary);

  // Validate that the results include the newly created manager
  const foundManager = pageSummary.data.find((m) => m.name === name);
  typia.assert(foundManager);

  TestValidator.predicate("manager found in list", foundManager !== undefined);

  // 3. Negative test: search with non-existent manager name
  const invalidRequest: IJobPerformanceEvalManager.IRequest = {
    search:
      "non_existent_manager_name_" +
      typia.random<string & tags.Format<"uuid">>(),
    page: 1,
    limit: 10,
  };

  const result = await api.functional.jobPerformanceEval.manager.managers.index(
    connection,
    {
      body: invalidRequest,
    },
  );
  typia.assert(result);

  TestValidator.predicate(
    "no managers should be found",
    result.data.length === 0,
  );
}
