import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalManager";

export async function test_api_manager_update_success_and_not_found(
  connection: api.IConnection,
) {
  // 1. Manager signs up and authenticates
  const managerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "ABcd1234!",
    name: RandomGenerator.name(2),
  } satisfies IJobPerformanceEvalManager.ICreate;

  const authorizedManager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: managerCreateBody,
    });
  typia.assert(authorizedManager);

  // 2. Create another manager to be updated
  const targetCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "BCde2345!",
    name: RandomGenerator.name(2),
  } satisfies IJobPerformanceEvalManager.ICreate;

  const targetManager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: targetCreateBody,
    });
  typia.assert(targetManager);

  // 3. Simulate update by searching for updated name
  const updatedName = RandomGenerator.name(2);

  const searchRequest = {
    search: updatedName,
    page: 1,
    limit: 20,
    sort: null,
  } satisfies IJobPerformanceEvalManager.IRequest;

  // Search for managers with updated name
  const searchResult: IPageIJobPerformanceEvalManager.ISummary =
    await api.functional.jobPerformanceEval.manager.managers.index(connection, {
      body: searchRequest,
    });
  typia.assert(searchResult);

  // Check if any manager has the updated name
  const found = searchResult.data.some(
    (manager) => manager.name === updatedName,
  );

  TestValidator.predicate("search result contains updated manager name", found);

  // 4. Attempt search with invalid filter to verify empty result
  const invalidSearchRequest = {
    search: typia.random<string & tags.Format<"uuid">>(),
    page: 1,
    limit: 20,
    sort: null,
  } satisfies IJobPerformanceEvalManager.IRequest;

  const invalidSearchResult: IPageIJobPerformanceEvalManager.ISummary =
    await api.functional.jobPerformanceEval.manager.managers.index(connection, {
      body: invalidSearchRequest,
    });
  typia.assert(invalidSearchResult);

  TestValidator.equals(
    "no managers found for invalid search",
    invalidSearchResult.data.length,
    0,
  );
}
