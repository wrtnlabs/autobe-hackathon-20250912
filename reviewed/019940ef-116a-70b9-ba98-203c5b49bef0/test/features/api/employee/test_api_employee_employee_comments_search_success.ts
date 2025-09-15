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
 * Test successful search and retrieval of employee comments on job
 * performance evaluations.
 *
 * This test performs the full flow from employee registration (to establish
 * authentication) through to successful search retrieval of employee
 * comments filtered by employee ID and evaluation cycle ID, validating
 * pagination and response conformity.
 *
 * Steps:
 *
 * 1. Register a new employee user by calling the join API, generating a valid
 *    create body.
 * 2. Authenticate and store the authorized employee including tokens.
 * 3. Build a search request filtering by the employee's ID and a realistic
 *    evaluation cycle ID with pagination.
 * 4. Call the employee comments search API using the authenticated context.
 * 5. Validate the response structure and content, including authentication
 *    alignment and pagination coherence.
 * 6. Use typia.assert to confirm API response schema and TestValidator to
 *    verify business logic.
 *
 * This test ensures correctness of the employee comments search
 * functionality in an authenticated context.
 */
export async function test_api_employee_employee_comments_search_success(
  connection: api.IConnection,
) {
  // 1. Register a new employee user to establish authentication context
  const createEmployeeBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32), // Secure hashed password string
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.ICreate;

  const authorizedEmployee: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: createEmployeeBody,
    });
  typia.assert(authorizedEmployee);

  // 2. Build a request to search employee comments filtered by employee ID and evaluation cycle ID
  const searchRequest = {
    search: null, // Explicitly null since optional and to clarify no keyword search
    employee_id: authorizedEmployee.id, // Filter only comments by this employee
    evaluation_cycle_id: typia.random<string & tags.Format<"uuid">>(), // Random realistic eval cycle UUID
    page: 1, // Starting page number
    limit: 100, // Limit to 100 records per page
  } satisfies IJobPerformanceEvalEmployeeComments.IRequest;

  // 3. Call the employee comments search endpoint with filter and pagination
  const searchResponse: IPageIJobPerformanceEvalEmployeeComments.ISummary =
    await api.functional.jobPerformanceEval.employee.employeeComments.index(
      connection,
      { body: searchRequest },
    );
  typia.assert(searchResponse);

  // 4. Validate pagination properties are coherent
  const pagination = searchResponse.pagination;
  TestValidator.predicate(
    "pagination current page matches request",
    pagination.current === searchRequest.page,
  );
  TestValidator.predicate("pagination limit is positive", pagination.limit > 0);
  TestValidator.predicate(
    "pagination has at least one page",
    pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    pagination.records >= 0,
  );

  // 5. Validate each employee comment summary in data matches filter employee ID
  for (const comment of searchResponse.data) {
    typia.assert(comment);
    TestValidator.equals(
      "comment has correct employee_id",
      comment.employee_id,
      authorizedEmployee.id,
    );
  }
}
