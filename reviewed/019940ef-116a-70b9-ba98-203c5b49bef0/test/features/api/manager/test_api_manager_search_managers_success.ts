import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalManager";

/**
 * This test validates the search and pagination functionality of the
 * manager users using PATCH /jobPerformanceEval/manager/managers endpoint.
 *
 * It first creates and authenticates a manager user using POST
 * /auth/manager/join to establish a valid authentication context. Then it
 * performs a search request with paging and sorting parameters. The
 * response is validated to contain correct pagination information and
 * manager summary data including valid UUID ids and non-empty names.
 *
 * This ensures the endpoint enforces authentication, handles filtering and
 * sorting, and returns paginated, correctly structured summaries of manager
 * accounts.
 */
export async function test_api_manager_search_managers_success(
  connection: api.IConnection,
) {
  // 1. Create a manager user and authenticate
  const createBody = {
    email: RandomGenerator.pick([
      "manager1@example.com",
      "manager2@example.com",
      "manager3@example.com",
    ]),
    password: "securePassword123",
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;

  const managerAuthorized: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: createBody,
    });
  typia.assert(managerAuthorized);

  // 2. Prepare search request body with pagination and sort
  const searchBody = {
    search: null,
    page: 1,
    limit: 10,
    sort: "name_asc",
  } satisfies IJobPerformanceEvalManager.IRequest;

  // 3. Retrieve paginated manager list
  const pageSummary: IPageIJobPerformanceEvalManager.ISummary =
    await api.functional.jobPerformanceEval.manager.managers.index(connection, {
      body: searchBody,
    });
  typia.assert(pageSummary);

  // 4. Validate pagination fields
  TestValidator.predicate(
    "pagination current page positive",
    pageSummary.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit positive",
    pageSummary.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    pageSummary.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages positive",
    pageSummary.pagination.pages > 0,
  );

  // 5. Validate each manager summary entry
  for (const manager of pageSummary.data) {
    typia.assert(manager);
    TestValidator.predicate(
      "manager id is valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1345][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        manager.id,
      ),
    );
    TestValidator.predicate(
      "manager name is non-empty string",
      typeof manager.name === "string" && manager.name.length > 0,
    );
  }
}
