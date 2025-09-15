import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployeeComments } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployeeComments";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIJobPerformanceEvalEmployeeComments } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalEmployeeComments";

/**
 * This test verifies that the employee comments search API properly handles
 * queries that result in no matching records for the manager role.
 *
 * It follows these steps:
 *
 * 1. A manager account is created and authenticated.
 * 2. A search request is made with filters that should return no results.
 * 3. The response is verified to contain an empty data array and coherent
 *    pagination information.
 *
 * Thus, it validates the empty result handling and pagination consistency
 * of the employee comments search functionality for managers.
 */

export async function test_api_manager_employee_comments_search_no_results(
  connection: api.IConnection,
) {
  // Create and authenticate a manager user
  const managerEmail: string = typia.random<string & tags.Format<"email">>();
  const managerPassword = "Password123!";
  const managerCreateBody = {
    email: managerEmail,
    password: managerPassword,
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;

  const managerAuth: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: managerCreateBody,
    });
  typia.assert(managerAuth);

  // Prepare search filters that will yield no results
  const noResultSearchBody = {
    search: "unlikelysearchtermxyz",
    employee_id: typia.random<string & tags.Format<"uuid">>(),
    evaluation_cycle_id: typia.random<string & tags.Format<"uuid">>(),
    page: 1,
    limit: 10,
  } satisfies IJobPerformanceEvalEmployeeComments.IRequest;

  // Perform the search
  const searchResult: IPageIJobPerformanceEvalEmployeeComments.ISummary =
    await api.functional.jobPerformanceEval.manager.employeeComments.index(
      connection,
      {
        body: noResultSearchBody,
      },
    );
  typia.assert(searchResult);

  // Verify the data array is empty
  TestValidator.predicate(
    "search returned no results",
    searchResult.data.length === 0,
  );

  // Verify pagination consistency for empty results
  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", searchResult.pagination.limit, 10);
  TestValidator.equals(
    "pagination total records",
    searchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination total pages",
    searchResult.pagination.pages,
    0,
  );
}
