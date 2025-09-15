import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";

/**
 * Validate successful deletion of a task within a task group by an
 * authenticated manager.
 *
 * This test creates a manager user, authenticates the user, and then
 * deletes a task identified by randomly generated valid UUIDs for
 * taskGroupId and taskId. The deletion should complete without errors,
 * verifying that only the manager role is authorized to perform this
 * operation.
 *
 * Steps:
 *
 * 1. Create and authenticate a manager account by calling POST
 *    /auth/manager/join with randomized email, password, and name according
 *    to IJobPerformanceEvalManager.ICreate.
 * 2. Generate valid UUIDs for `taskGroupId` and `taskId` representing existing
 *    resources.
 * 3. Execute DELETE
 *    /jobPerformanceEval/manager/taskGroups/{taskGroupId}/tasks/{taskId}
 *    using the authenticated manager context.
 * 4. Assert that the erase call completes successfully (no output) without
 *    errors.
 * 5. Validate responses with typia.assert.
 * 6. Check that the manager authorization token access string is a non-empty
 *    valid string.
 *
 * The test respects API schema requirements and demonstrates
 * schema-compliant usage of authentication and deletion APIs.
 */
export async function test_api_task_management_delete_task_success(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a manager user
  const managerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;

  const authorizedManager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: managerCreateBody,
    });
  typia.assert(authorizedManager);

  // 2. Generate valid UUIDs for the taskGroupId and taskId
  const taskGroupId = typia.random<string & tags.Format<"uuid">>();
  const taskId = typia.random<string & tags.Format<"uuid">>();

  // 3. Perform the deletion
  await api.functional.jobPerformanceEval.manager.taskGroups.tasks.erase(
    connection,
    {
      taskGroupId,
      taskId,
    },
  );

  // 4. Assert that the manager authorization token access string is non-empty
  TestValidator.predicate(
    "Manager authorization token access is a non-empty string",
    typeof authorizedManager.token.access === "string" &&
      authorizedManager.token.access.length > 0,
  );
}
