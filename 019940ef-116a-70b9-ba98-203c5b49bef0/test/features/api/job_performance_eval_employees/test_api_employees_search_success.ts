import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployees } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployees";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIJobPerformanceEvalEmployees } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalEmployees";

/**
 * This end-to-end test verifies that a manager user can join the system and
 * then search for employees using the manager's authenticated context.
 *
 * It covers the full workflow of authentication and employee search, including
 * pagination and filtering by a realistic search keyword.
 *
 * The test validates the manager is authorized and receives a token, and that
 * the employees list response contains valid pagination data and employee
 * summaries.
 */
export async function test_api_employees_search_success(
  connection: api.IConnection,
) {
  // 1. Manager joins the system and gets authenticated
  const managerCreateBody = {
    email: `manager_${RandomGenerator.alphaNumeric(6)}@company.com`,
    password: "StrongPass!23",
    name: RandomGenerator.name(2),
  } satisfies IJobPerformanceEvalManager.ICreate;

  const manager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: managerCreateBody,
    });
  // Assert type safety and correctness
  typia.assert(manager);

  // 2. Compose a search request with pagination and a search keyword
  const pageNumber: number & tags.Type<"int32"> & tags.Minimum<0> =
    1 satisfies number as number;
  const pageLimit: number & tags.Type<"int32"> & tags.Minimum<0> =
    10 satisfies number as number;

  // For search keyword, pick random alphabets of length 3 to simulate partial name/email
  const searchKeyword = RandomGenerator.alphabets(3);

  const employeeSearchRequest = {
    page: pageNumber,
    limit: pageLimit,
    search: searchKeyword,
    order_by_name: "asc" as const,
  } satisfies IJobPerformanceEvalEmployees.IRequest;

  // 3. Search employees using the authenticated manager context
  const employeePage: IPageIJobPerformanceEvalEmployees.ISummary =
    await api.functional.jobPerformanceEval.manager.employees.index(
      connection,
      {
        body: employeeSearchRequest,
      },
    );

  typia.assert(employeePage);

  // 4. Validate pagination metadata fields
  const { pagination, data } = employeePage;
  TestValidator.equals(
    "pagination current page",
    pagination.current,
    pageNumber,
  );
  TestValidator.equals("pagination limit", pagination.limit, pageLimit);
  TestValidator.predicate(
    "pagination total records non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate("pagination pages positive", pagination.pages > 0);

  // 5. Validate the employee summaries list
  TestValidator.predicate(
    "employee data contains at least one entry",
    Array.isArray(data) && data.length > 0,
  );

  for (const employee of data) {
    typia.assert(employee);
    TestValidator.predicate(
      "employee id is a uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        employee.id,
      ),
    );
    TestValidator.predicate(
      "employee name is non-empty",
      typeof employee.name === "string" && employee.name.length > 0,
    );
  }
}
