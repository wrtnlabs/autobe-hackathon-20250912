import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IJobPerformanceEvalManagerComments } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManagerComments";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIJobPerformanceEvalManagerComments } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalManagerComments";

/**
 * This E2E test validates the workflow of creating and authenticating a
 * manager user, followed by using that authentication to perform a
 * paginated search for manager comments with filtering criteria.
 *
 * The test ensures that manager role authentication is correctly
 * established through the join endpoint and that the search API returns
 * valid pagination data with comments filtered by the authenticated
 * manager's id.
 *
 * The test checks the structural correctness and business logic consistency
 * of responses using typia.assert for strict type validation and
 * TestValidator for meaningful runtime assertions.
 *
 * Steps:
 *
 * 1. Create and authenticate a new manager user
 * 2. Prepare and send paginated search request with filters including the
 *    authenticated manager's id
 * 3. Assert the response structure for pagination and comment summaries
 * 4. Validate pagination data ranges and content format
 */
export async function test_api_manager_manager_comments_search_success(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a new manager user
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;

  const authorizedManager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: createBody,
    });
  typia.assert(authorizedManager);

  // 2. Prepare search request body with pagination and filters
  const searchRequestBody = {
    page: 1,
    limit: 10,
    manager_id: authorizedManager.id,
    evaluation_cycle_id: null,
    comment: null,
    orderBy: "created_at_DESC",
  } satisfies IJobPerformanceEvalManagerComments.IRequest;

  // 3. Perform the manager comments search
  const searchResult: IPageIJobPerformanceEvalManagerComments.ISummary =
    await api.functional.jobPerformanceEval.manager.managerComments.searchManagerComments(
      connection,
      {
        body: searchRequestBody,
      },
    );
  typia.assert(searchResult);

  // 4. Validate pagination structure
  TestValidator.predicate(
    "pagination current page > 0",
    searchResult.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    searchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages >= current",
    searchResult.pagination.pages >= searchResult.pagination.current,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    searchResult.pagination.records >= 0,
  );

  // 5. Validate all returned summaries contain manager comments with valid data
  for (const comment of searchResult.data) {
    typia.assert(comment);
    TestValidator.predicate(
      "comment id is uuid",
      /^[0-9a-fA-F-]{36}$/.test(comment.id),
    );
    TestValidator.predicate(
      "comment text is string",
      typeof comment.comment === "string",
    );
    TestValidator.predicate(
      "comment created_at date-time",
      !isNaN(Date.parse(comment.created_at)),
    );
    TestValidator.predicate(
      "comment updated_at date-time",
      !isNaN(Date.parse(comment.updated_at)),
    );
  }
}
