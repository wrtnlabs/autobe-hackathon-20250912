import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalTaskActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTaskActivity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIJobPerformanceEvalTaskActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalTaskActivity";

/**
 * Test unauthorized access to fetch task activities by taskId.
 *
 * This test ensures that the PATCH
 * /jobPerformanceEval/employee/tasks/{taskId}/taskActivities endpoint
 * returns an authorization error when called without proper authentication.
 * It first executes the dependency join operation to create an employee
 * user but simulates an unauthenticated request to the main endpoint.
 *
 * Expectations:
 *
 * - The unauthorized request must fail with an error indicating lack of
 *   authentication.
 * - No valid task activity data should be returned.
 */
export async function test_api_taskactivity_list_by_task_unauthorized(
  connection: api.IConnection,
) {
  // 1. Perform employee join operation to setup system state but deliberately ignore the auth token
  const employeeBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.ICreate;

  await api.functional.auth.employee.join.joinEmployee(connection, {
    body: employeeBody,
  });

  // 2. Generate a random taskId (UUID format) to query task activities
  const taskId = typia.random<string & tags.Format<"uuid">>();

  // 3. Define a minimal IRequest body with default pagination and filters, including explicit nulls
  const requestBody = {
    page: 1,
    limit: 10,
    search: null,
    task_id: null,
    orderBy: null,
  } satisfies IJobPerformanceEvalTaskActivity.IRequest;

  // 4. Attempt to call the task activities listing API without authentication and expect failure
  await TestValidator.error(
    "unauthorized access denied for task activities",
    async () => {
      // Clone connection and clear headers to simulate no authentication
      const unauthConnection: api.IConnection = { ...connection, headers: {} };
      await api.functional.jobPerformanceEval.employee.tasks.taskActivities.index(
        unauthConnection,
        {
          taskId,
          body: requestBody,
        },
      );
    },
  );
}
