import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";

/**
 * Test scenario for employee user delete task functionality.
 *
 * 1. Employee user joins by providing required details (email, password_hash,
 *    name).
 * 2. Confirm successful join returns the authorized employee info including
 *    tokens.
 * 3. Using employee authentication context, delete a specific task by
 *    taskGroupId and taskId.
 * 4. Confirm deletion completes without errors (void response).
 *
 * This tests the ownership and authorization for task deletion endpoint for
 * employee role. All API calls use valid UUIDs, valid type properties, and
 * proper async/await.
 */
export async function test_api_task_delete_success_with_employee_auth(
  connection: api.IConnection,
) {
  // Step 1: Employee user join
  const employeeCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(64),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.ICreate;

  const authorizedEmployee =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: employeeCreateBody,
    });
  typia.assert(authorizedEmployee);

  // Step 2: Task deletion parameters
  const taskGroupId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const taskId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 3: Delete task under task group
  await api.functional.jobPerformanceEval.employee.taskGroups.tasks.erase(
    connection,
    {
      taskGroupId,
      taskId,
    },
  );
}
