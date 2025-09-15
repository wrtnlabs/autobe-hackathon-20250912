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
 * This test validates a successful search for employee comments by a manager.
 * It covers creating a new manager user (authentication), then querying the API
 * with employee and evaluation cycle filters including pagination. The response
 * is validated for structure, pagination correctness, and filter consistency.
 *
 * 1. A new manager is created via the join API
 * 2. A search request body with realistic filter values is prepared
 * 3. The employee comments search endpoint is invoked with manager authorization
 * 4. The response is asserted for exact typing and pagination fields are verified
 * 5. Each returned employee comment summary is validated
 * 6. Filter parameters are checked against returned data
 *
 * This ensures an authenticated manager can correctly list employee comments
 * with proper pagination and filtering.
 */
export async function test_api_manager_employee_comments_search_success(
  connection: api.IConnection,
) {
  // 1. Create manager and authenticate
  const managerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPass1234", // Assumed valid password per policy
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;

  const managerAuth = await api.functional.auth.manager.join(connection, {
    body: managerCreateBody,
  });
  typia.assert(managerAuth);

  // 2. Prepare employee comments search request
  const requestBody = {
    employee_id: typia.random<string & tags.Format<"uuid">>(),
    evaluation_cycle_id: typia.random<string & tags.Format<"uuid">>(),
    page: 1,
    limit: 50,
  } satisfies IJobPerformanceEvalEmployeeComments.IRequest;

  // 3. Call the search employee comments endpoint
  const response =
    await api.functional.jobPerformanceEval.manager.employeeComments.index(
      connection,
      { body: requestBody },
    );

  // 4. Assert the response type
  typia.assert(response);

  // 5. Validate pagination properties
  TestValidator.predicate(
    "pagination current is number and >= 0",
    typeof response.pagination.current === "number" &&
      response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is number and >= 0",
    typeof response.pagination.limit === "number" &&
      response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is number and >= 0",
    typeof response.pagination.records === "number" &&
      response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is number and >= 0",
    typeof response.pagination.pages === "number" &&
      response.pagination.pages >= 0,
  );

  // 6. Validate each comment summary
  for (const comment of response.data) {
    TestValidator.predicate(
      "comment id is UUID string",
      typeof comment.id === "string" && comment.id.length === 36,
    );
    TestValidator.predicate(
      "comment employee_id is UUID string",
      typeof comment.employee_id === "string" &&
        comment.employee_id.length === 36,
    );
    TestValidator.predicate(
      "comment evaluation_cycle_id is UUID string",
      typeof comment.evaluation_cycle_id === "string" &&
        comment.evaluation_cycle_id.length === 36,
    );
    TestValidator.predicate(
      "comment has comment text",
      typeof comment.comment === "string" && comment.comment.length > 0,
    );

    // 7. Optional filter validation
    if (
      requestBody.employee_id !== null &&
      requestBody.employee_id !== undefined
    ) {
      TestValidator.equals(
        "employee_id filter matched",
        comment.employee_id,
        requestBody.employee_id,
      );
    }
    if (
      requestBody.evaluation_cycle_id !== null &&
      requestBody.evaluation_cycle_id !== undefined
    ) {
      TestValidator.equals(
        "evaluation_cycle_id filter matched",
        comment.evaluation_cycle_id,
        requestBody.evaluation_cycle_id,
      );
    }
  }
}
