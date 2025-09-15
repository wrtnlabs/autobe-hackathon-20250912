import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalSelfEvaluation } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalSelfEvaluation";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIJobPerformanceEvalSelfEvaluation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalSelfEvaluation";

/**
 * Test employee self-evaluation listing with employee authentication.
 *
 * This E2E test performs the following steps:
 *
 * 1. Registers a new employee via /auth/employee/join endpoint with random
 *    valid data.
 * 2. Receives employee authorization data including employee ID and JWT
 *    tokens.
 * 3. Uses the authenticated connection to request a paginated self-evaluation
 *    list filtered by the employee ID.
 * 4. Validates the response type, pagination data, and ensures all returned
 *    self-evaluations belong to the employee.
 *
 * The test verifies employee-limited access and verifies correct pagination
 * and filtering. All API calls are awaited and correctly typed with
 * typia.assert to validate runtime type conformance.
 *
 * No manual header manipulation is done, and authentication tokens are
 * handled by the SDK automatically.
 */
export async function test_api_employee_self_evaluation_list_with_employee_authentication(
  connection: api.IConnection,
) {
  // 1. Create a new employee user and authenticate
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32), // Simulated hashed password
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.ICreate;
  const employee: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: createBody,
    });
  typia.assert(employee);
  // 2. Prepare search filter with employee_id and pagination parameters
  const requestBody = {
    employee_id: employee.id,
    evaluation_cycle_id: null,
    page: 1,
    limit: 10,
  } satisfies IJobPerformanceEvalSelfEvaluation.IRequest;

  // 3. Search self-evaluations with employee authentication
  const output: IPageIJobPerformanceEvalSelfEvaluation.ISummary =
    await api.functional.jobPerformanceEval.employee.selfEvaluations.searchSelfEvaluations(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(output);
  // 4. Validate pagination info
  TestValidator.equals(
    "pagination current page matches request",
    output.pagination.current,
    requestBody.page!,
  );
  TestValidator.equals(
    "pagination limit matches request",
    output.pagination.limit,
    requestBody.limit!,
  );
  // 5. Validate that all self-evaluations belong to the employee
  if (output.data.length > 0) {
    for (const evaluation of output.data) {
      typia.assert(evaluation);
      TestValidator.equals(
        "self-evaluation employee_id matches created employee",
        evaluation.employee_id,
        employee.id,
      );
    }
  } else {
    // If no self-evaluations, data must be an empty array
    TestValidator.equals("no data present", output.data.length, 0);
  }
}
