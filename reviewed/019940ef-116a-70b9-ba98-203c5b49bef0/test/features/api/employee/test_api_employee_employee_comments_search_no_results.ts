import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalEmployeeComments } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployeeComments";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIJobPerformanceEvalEmployeeComments } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalEmployeeComments";

/**
 * Validate searching employee comments returns empty when filters yield no
 * results.
 *
 * This test creates and authenticates a new employee user, then performs a
 * search on employee comments with filters guaranteed to return zero
 * results. It asserts that the response contains an empty data array and
 * proper pagination metadata.
 *
 * Steps:
 *
 * 1. Create and authenticate a new employee user with random but valid data.
 * 2. Perform a PATCH request to the employeeComments endpoint with filters set
 *    using random UUIDs that do not correspond to any existing comments and
 *    pagination.
 * 3. Assert the response contains zero comments, and pagination reflects zero
 *    records.
 *
 * This test ensures that the system correctly handles empty search result
 * scenarios while properly authenticated as an employee.
 */
export async function test_api_employee_employee_comments_search_no_results(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate new employee
  const createBody = {
    email: `test.${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.ICreate;
  const employee: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: createBody,
    });
  typia.assert(employee);

  // Step 2: Call employeeComments index endpoint to search with no results
  // Use random UUIDs for employee_id and evaluation_cycle_id
  const filter: IJobPerformanceEvalEmployeeComments.IRequest = {
    employee_id: typia.random<string & tags.Format<"uuid">>(),
    evaluation_cycle_id: typia.random<string & tags.Format<"uuid">>(),
    page: 1,
    limit: 10,
  };
  const result: IPageIJobPerformanceEvalEmployeeComments.ISummary =
    await api.functional.jobPerformanceEval.employee.employeeComments.index(
      connection,
      { body: filter },
    );
  typia.assert(result);

  // Step 3: Validate that the returned data array is empty
  TestValidator.equals("result data array is empty", result.data.length, 0);

  // Step 4: Validate pagination shows zero records
  TestValidator.equals(
    "pagination current page is 1",
    result.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 10", result.pagination.limit, 10);
  TestValidator.equals(
    "pagination total records is 0",
    result.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination total pages is 0",
    result.pagination.pages,
    0,
  );
}
