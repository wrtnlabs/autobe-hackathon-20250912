import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalTaskGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTaskGroup";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIJobPerformanceEvalTaskGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalTaskGroup";

/**
 * Verify task group listing for job role using employee credentials.
 *
 * Full scenario:
 *
 * 1. Create and authenticate new employee.
 * 2. Retrieve task groups with full pagination and filters:
 *
 *    - Filter by partial name substring
 *    - Filter by partial code substring
 *    - Paginate result with page 0 and a limit
 *    - Confirm pagination metadata matches expectations
 * 3. Test edge case of empty result by filtering with unmatched strings.
 *    Validate pagination pages is zero when no data.
 * 4. Test pagination boundaries (page 0 and large page number with no
 *    results).
 * 5. Test unauthorized access with no authentication, expect failure.
 * 6. All API responses validated with typia.assert.
 * 7. Use descriptive TestValidator assertions for logic validations.
 */
export async function test_api_task_group_list_employee_role_pagination_and_filtering(
  connection: api.IConnection,
) {
  // 1. Create and authenticate employee
  const employeeCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(20),
    name: RandomGenerator.name(2),
  } satisfies IJobPerformanceEvalEmployee.ICreate;
  const employee: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: employeeCreateData,
    });
  typia.assert(employee);

  // Use random UUID for jobRoleId for test invocation
  const jobRoleId = typia.random<string & tags.Format<"uuid">>();

  // 2. Call API to list task groups - get initial page with no filters
  const baseRequest = {
    page: 0,
    limit: 10,
  } satisfies IJobPerformanceEvalTaskGroup.IRequest;
  let response: IPageIJobPerformanceEvalTaskGroup.ISummary =
    await api.functional.jobPerformanceEval.employee.jobRoles.taskGroups.index(
      connection,
      { jobRoleId, body: baseRequest },
    );
  typia.assert(response);

  // Basic pagination validation
  TestValidator.predicate(
    "pagination current page must equal request page",
    response.pagination.current === 0,
  );
  TestValidator.predicate(
    "pagination limit must equal request limit",
    response.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination pages must be >= 0",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records must be >= data length",
    response.pagination.records >= response.data.length,
  );

  // 2a Filter by partial name - choose substring of any item if exists
  if (response.data.length > 0) {
    const partialName =
      response.data[0].name.length > 0
        ? response.data[0].name.slice(
            0,
            Math.min(3, response.data[0].name.length),
          )
        : "";
    if (partialName !== "") {
      const filterByNameRequest = {
        name: partialName,
        page: 0,
        limit: 10,
      } satisfies IJobPerformanceEvalTaskGroup.IRequest;
      const filteredByName =
        await api.functional.jobPerformanceEval.employee.jobRoles.taskGroups.index(
          connection,
          { jobRoleId, body: filterByNameRequest },
        );
      typia.assert(filteredByName);
      TestValidator.predicate(
        "filtered data by name contains filter substring",
        filteredByName.data.every((x) => x.name.includes(partialName)),
      );
    }
  }

  // 2b Filter by partial code - similar approach
  if (response.data.length > 0) {
    const partialCode =
      response.data[0].code.length > 0
        ? response.data[0].code.slice(
            0,
            Math.min(3, response.data[0].code.length),
          )
        : "";
    if (partialCode !== "") {
      const filterByCodeRequest = {
        code: partialCode,
        page: 0,
        limit: 10,
      } satisfies IJobPerformanceEvalTaskGroup.IRequest;
      const filteredByCode =
        await api.functional.jobPerformanceEval.employee.jobRoles.taskGroups.index(
          connection,
          { jobRoleId, body: filterByCodeRequest },
        );
      typia.assert(filteredByCode);
      TestValidator.predicate(
        "filtered data by code contains filter substring",
        filteredByCode.data.every((x) => x.code.includes(partialCode)),
      );
    }
  }

  // 3. Test empty results - use unlikely filter strings
  const emptyFilterReq = {
    name: "unlikely_name_abcdefg12345",
    code: "unlikely_code_xyz6789",
    page: 0,
    limit: 10,
  } satisfies IJobPerformanceEvalTaskGroup.IRequest;
  const emptyResult =
    await api.functional.jobPerformanceEval.employee.jobRoles.taskGroups.index(
      connection,
      { jobRoleId, body: emptyFilterReq },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty filtered result yields no data",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty filtered result pages is zero",
    emptyResult.pagination.pages,
    0,
  );

  // 4. Pagination boundary test - page 0 and large page number
  const pageZeroReq = {
    page: 0,
    limit: 5,
  } satisfies IJobPerformanceEvalTaskGroup.IRequest;
  const pageZeroResult =
    await api.functional.jobPerformanceEval.employee.jobRoles.taskGroups.index(
      connection,
      { jobRoleId, body: pageZeroReq },
    );
  typia.assert(pageZeroResult);
  TestValidator.predicate(
    "page 0 data count <= limit",
    pageZeroResult.data.length <= 5,
  );

  const largePageReq = {
    page: 1000,
    limit: 10,
  } satisfies IJobPerformanceEvalTaskGroup.IRequest;
  const largePageResult =
    await api.functional.jobPerformanceEval.employee.jobRoles.taskGroups.index(
      connection,
      { jobRoleId, body: largePageReq },
    );
  typia.assert(largePageResult);
  TestValidator.equals(
    "large page with no data",
    largePageResult.data.length,
    0,
  );

  // 5. Unauthorized access test with no authentication
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized access should throw error",
    async () => {
      await api.functional.jobPerformanceEval.employee.jobRoles.taskGroups.index(
        unauthConn,
        { jobRoleId, body: baseRequest },
      );
    },
  );
}
