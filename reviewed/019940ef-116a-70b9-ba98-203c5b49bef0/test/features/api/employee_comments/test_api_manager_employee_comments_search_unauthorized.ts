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
 * Validate unauthorized access to employee comments search endpoint.
 *
 * This test confirms that attempting to fetch employee comments as a
 * manager without authentication credentials is correctly rejected by the
 * API.
 *
 * - Step 1: Join a manager user with valid credentials.
 * - Step 2: Attempt to search employee comments without authorization.
 * - Step 3: Expect an error due to unauthorized access.
 */
export async function test_api_manager_employee_comments_search_unauthorized(
  connection: api.IConnection,
) {
  // 1. Manager account creation
  const managerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;
  const manager = await api.functional.auth.manager.join(connection, {
    body: managerCreateBody,
  });
  typia.assert(manager);

  // 2. Unauthorized search attempt without authentication header
  // Create unauthenticated connection object overriding headers to empty
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Prepare empty search body as per IRequest type
  const searchBody = {} satisfies IJobPerformanceEvalEmployeeComments.IRequest;

  // 4. Expect error when searching employee comments without authorization
  await TestValidator.error(
    "Unauthorized access to employee comments search should fail",
    async () => {
      await api.functional.jobPerformanceEval.manager.employeeComments.index(
        unauthenticatedConnection,
        { body: searchBody },
      );
    },
  );
}
