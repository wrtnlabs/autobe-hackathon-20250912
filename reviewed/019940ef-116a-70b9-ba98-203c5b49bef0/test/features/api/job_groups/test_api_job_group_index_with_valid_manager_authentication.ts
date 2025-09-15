import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalJobGroups } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobGroups";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIJobPerformanceEvalJobGroups } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalJobGroups";

/**
 * Test retrieving a paginated list of job groups with valid authentication.
 *
 * This test function validates the business flow where a manager user is
 * created and authenticated first. Then, the system is queried to retrieve
 * a paginated listing of job groups. The test ensures role-based access
 * control is properly enforced and that the response structure adheres to
 * pagination and listing expectations.
 *
 * Workflow Steps:
 *
 * 1. Register a new manager user by calling the join API.
 * 2. Request a paginated list of job groups using valid authentication.
 * 3. Assert the response contains pagination metadata and a list of job group
 *    summaries.
 * 4. Validate the structural integrity and correctness of key response fields.
 *
 * The purpose is to ensure the manager's privileged access works and the
 * listing behaves correctly.
 */
export async function test_api_job_group_index_with_valid_manager_authentication(
  connection: api.IConnection,
) {
  // Step 1: Manager user creation and authentication
  const managerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;

  const manager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, { body: managerBody });
  typia.assert(manager);

  // Step 2: Paginated list of job groups query
  const jobGroupsRequest = {
    code: "",
    name: null,
    createdAfter: null,
    createdBefore: null,
    page: 1,
    limit: 10,
    sortKey: null,
    sortOrder: null,
  } satisfies IJobPerformanceEvalJobGroups.IRequest;

  const jobGroupsResponse =
    await api.functional.jobPerformanceEval.manager.jobGroups.index(
      connection,
      { body: jobGroupsRequest },
    );
  typia.assert(jobGroupsResponse);

  // Step 3: Assert pagination exists
  TestValidator.predicate(
    "pagination object exists",
    jobGroupsResponse.pagination !== null &&
      jobGroupsResponse.pagination !== undefined,
  );
  TestValidator.equals(
    "pagination current page equals request page",
    jobGroupsResponse.pagination.current,
    jobGroupsRequest.page,
  );
  TestValidator.equals(
    "pagination limit equals request limit",
    jobGroupsResponse.pagination.limit,
    jobGroupsRequest.limit,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    jobGroupsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    jobGroupsResponse.pagination.pages >= 0,
  );

  // Step 4: Assert data array exists and each element has required properties
  TestValidator.predicate(
    "data array exists",
    Array.isArray(jobGroupsResponse.data),
  );
  for (const summary of jobGroupsResponse.data) {
    typia.assert(summary);
    TestValidator.predicate(
      "summary has id",
      typeof summary.id === "string" && summary.id.length > 0,
    );
    TestValidator.predicate(
      "summary has code",
      typeof summary.code === "string",
    );
    TestValidator.predicate(
      "summary has name",
      typeof summary.name === "string",
    );
  }
}
