import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalJobGroups } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobGroups";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIJobPerformanceEvalJobGroups } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalJobGroups";

/**
 * Verify that an employee user can authenticate successfully and then
 * retrieve a paginated list of job groups with correct pagination metadata
 * and data list.
 *
 * 1. Register an employee user via the join endpoint.
 * 2. Use the authenticated context to request job groups with pagination.
 * 3. Validate the response metadata fields: current page, limit, total
 *    records, total pages.
 * 4. Validate the data array contains proper job group summaries with id,
 *    code, and name.
 */
export async function test_api_job_group_index_with_valid_employee_authentication(
  connection: api.IConnection,
) {
  // Step 1: Employee user creation (join)
  const createEmployeeBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(64),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.ICreate;

  const authorized: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: createEmployeeBody,
    });
  typia.assert(authorized);

  // Step 2: Request paginated list of job groups with specified criteria
  const requestBody = {
    code: "default",
    name: null,
    createdAfter: null,
    createdBefore: null,
    page: 1,
    limit: 10,
    sortKey: null,
    sortOrder: null,
  } satisfies IJobPerformanceEvalJobGroups.IRequest;

  const response: IPageIJobPerformanceEvalJobGroups.ISummary =
    await api.functional.jobPerformanceEval.employee.jobGroups.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(response);

  // Step 3: Validate pagination metadata
  const pg = response.pagination;

  TestValidator.predicate(
    "pagination current page should be >= 0",
    pg.current >= 0,
  );
  TestValidator.predicate("pagination limit should be >= 0", pg.limit >= 0);
  TestValidator.predicate("pagination records should be >= 0", pg.records >= 0);
  TestValidator.predicate("pagination pages should be >= 0", pg.pages >= 0);

  // Step 4: Validate data array contains job group summaries
  TestValidator.predicate(
    "job groups data should be an array",
    Array.isArray(response.data),
  );
  for (const jobGroup of response.data) {
    typia.assert(jobGroup); // Each job group summary
    TestValidator.predicate(
      "job group id should be UUID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        jobGroup.id,
      ),
    );
    TestValidator.predicate(
      "job group code should be non-empty string",
      typeof jobGroup.code === "string" && jobGroup.code.length > 0,
    );
    TestValidator.predicate(
      "job group name should be non-empty string",
      typeof jobGroup.name === "string" && jobGroup.name.length > 0,
    );
  }
}
