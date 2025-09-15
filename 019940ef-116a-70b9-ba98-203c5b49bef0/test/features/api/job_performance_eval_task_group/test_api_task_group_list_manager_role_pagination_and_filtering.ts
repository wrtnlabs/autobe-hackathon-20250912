import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IJobPerformanceEvalTaskGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTaskGroup";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIJobPerformanceEvalTaskGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalTaskGroup";

/**
 * End-to-end test for manager role listing of task groups with pagination
 * and filtering capabilities.
 *
 * This test covers:
 *
 * 1. Authentication of a new manager user using the join endpoint.
 * 2. Retrieving task groups for a specific job role with various filters:
 *
 *    - No filter (default pagination)
 *    - Filtering by code and name with partial matches
 *    - Pagination edge cases (first page, minimal limit)
 * 3. Validating the structure and content of paginated responses.
 * 4. Verifying unauthorized access is rejected.
 *
 * The test ensures that the backend correctly enforces manager
 * authentication, applies filters, respects pagination params, and returns
 * properly structured data. It also ensures that unauthorized requests to
 * the patch taskGroups endpoint fail.
 */
export async function test_api_task_group_list_manager_role_pagination_and_filtering(
  connection: api.IConnection,
) {
  // 1. Manager joins and authenticates
  const email: string = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    email,
    password: "SecurePassword123!",
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;

  const manager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: joinBody,
    });
  typia.assert(manager);

  // Use authenticated token from manager.token

  // Prepare a valid jobRoleId (simulate a UUID)
  const jobRoleId: string = typia.random<string & tags.Format<"uuid">>();

  // 2. Test fetching task groups with no filter
  const emptyFilterBody: IJobPerformanceEvalTaskGroup.IRequest = {
    job_role_id: jobRoleId,
    code: null,
    name: null,
    page: 0,
    limit: 10,
    orderBy: null,
  };
  const pageDefault: IPageIJobPerformanceEvalTaskGroup.ISummary =
    await api.functional.jobPerformanceEval.manager.jobRoles.taskGroups.index(
      connection,
      {
        jobRoleId: jobRoleId,
        body: emptyFilterBody,
      },
    );
  typia.assert(pageDefault);
  TestValidator.predicate(
    "default page data is array",
    Array.isArray(pageDefault.data),
  );
  TestValidator.predicate(
    "default page pagination has current property",
    typeof pageDefault.pagination.current === "number",
  );

  // 3. Test filtering by partial code and name
  // Generate realistic partial filter strings
  const partialCode = RandomGenerator.substring("codeExample123");
  const partialName = RandomGenerator.substring("nameExampleABC");
  const filterBody: IJobPerformanceEvalTaskGroup.IRequest = {
    job_role_id: jobRoleId,
    code: partialCode,
    name: partialName,
    page: 0,
    limit: 5,
    orderBy: null,
  };
  const pageFiltered: IPageIJobPerformanceEvalTaskGroup.ISummary =
    await api.functional.jobPerformanceEval.manager.jobRoles.taskGroups.index(
      connection,
      {
        jobRoleId: jobRoleId,
        body: filterBody,
      },
    );
  typia.assert(pageFiltered);
  TestValidator.predicate(
    "filtered page data is array",
    Array.isArray(pageFiltered.data),
  );

  // If data exists, all should have code and name containing the filter strings
  if (pageFiltered.data.length > 0) {
    const allCodeMatch = pageFiltered.data.every(
      (item) => item.code.includes(partialCode) || partialCode.length === 0,
    );
    TestValidator.predicate(
      "all filtered data code string matches filter",
      allCodeMatch,
    );
    const allNameMatch = pageFiltered.data.every(
      (item) => item.name.includes(partialName) || partialName.length === 0,
    );
    TestValidator.predicate(
      "all filtered data name string matches filter",
      allNameMatch,
    );
  }

  // 4. Test pagination edge cases page=0, limit=1
  const paginationBody: IJobPerformanceEvalTaskGroup.IRequest = {
    job_role_id: jobRoleId,
    code: null,
    name: null,
    page: 0,
    limit: 1,
    orderBy: null,
  };
  const pageSmallLimit: IPageIJobPerformanceEvalTaskGroup.ISummary =
    await api.functional.jobPerformanceEval.manager.jobRoles.taskGroups.index(
      connection,
      {
        jobRoleId: jobRoleId,
        body: paginationBody,
      },
    );
  typia.assert(pageSmallLimit);
  TestValidator.equals(
    "pagination limit equals 1",
    pageSmallLimit.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "pagination data length less or equal limit",
    pageSmallLimit.data.length <= 1,
  );

  // 5. Unauthorized access test - no auth token
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized request should fail", async () => {
    await api.functional.jobPerformanceEval.manager.jobRoles.taskGroups.index(
      unauthConn,
      {
        jobRoleId: jobRoleId,
        body: emptyFilterBody,
      },
    );
  });

  // 6. Unauthorized access test - invalid token
  const invalidTokenConn: api.IConnection = {
    ...connection,
    headers: { Authorization: "Bearer invalidtoken123" },
  };
  await TestValidator.error(
    "request with invalid token should fail",
    async () => {
      await api.functional.jobPerformanceEval.manager.jobRoles.taskGroups.index(
        invalidTokenConn,
        {
          jobRoleId: jobRoleId,
          body: emptyFilterBody,
        },
      );
    },
  );
}
