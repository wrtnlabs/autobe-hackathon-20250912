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
 * Test unauthorized access to employee comments list API.
 *
 * Verifies that accessing the employee comments search endpoint without
 * authentication fails as expected, enforcing authorization security.
 *
 * Scenario:
 *
 * 1. Perform employee join to create valid user context.
 * 2. Create unauthenticated connection (clear headers).
 * 3. Attempt to fetch employee comments list via PATCH
 *    /jobPerformanceEval/employee/employeeComments with minimal request
 *    body.
 * 4. Expect an authorization failure HTTP error (401 or 403).
 * 5. Validate that security correctly blocks unauthorized access.
 *
 * This confirms that the employee comments API endpoint correctly rejects
 * requests without valid authentication credentials.
 */
export async function test_api_employee_employee_comments_search_unauthorized(
  connection: api.IConnection,
) {
  // Step 1: Authenticate a new employee user to establish context
  const employeeCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.ICreate;

  const employee: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: employeeCreateBody,
    });
  typia.assert(employee);

  // Step 2: Create an unauthenticated connection without auth headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 3: Define a minimal empty search request for employee comments
  const employeeCommentsRequest =
    {} satisfies IJobPerformanceEvalEmployeeComments.IRequest;

  // Step 4: Attempt to call the employee comments API without auth and expect failure
  await TestValidator.error(
    "employee comments search without auth should fail",
    async () => {
      await api.functional.jobPerformanceEval.employee.employeeComments.index(
        unauthenticatedConnection,
        { body: employeeCommentsRequest },
      );
    },
  );
}
