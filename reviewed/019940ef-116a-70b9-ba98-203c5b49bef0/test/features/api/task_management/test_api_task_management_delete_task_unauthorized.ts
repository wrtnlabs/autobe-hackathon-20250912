import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";

/**
 * Unauthorized deletion attempt of a task within a task group by an
 * unauthenticated user. Verifies that the system rejects the request with
 * appropriate unauthorized error status. Pre-existing task group and task
 * exist, but no authentication context is provided. This test ensures security
 * enforcement on task deletion endpoint.
 */
export async function test_api_task_management_delete_task_unauthorized(
  connection: api.IConnection,
) {
  // 0. Prerequisite: Manager joins (to have an existing manager in the system)
  const managerCreateBody = {
    email: `unauth-test+${typia.random<string & tags.Format<"email">>()}`,
    password: "NotSecret123!",
    name: "Unauthorized Tester",
  } satisfies IJobPerformanceEvalManager.ICreate;

  await api.functional.auth.manager.join(connection, {
    body: managerCreateBody,
  });

  // 1. Prepare taskGroupId and taskId with valid UUIDs
  const taskGroupId = typia.random<string & tags.Format<"uuid">>();
  const taskId = typia.random<string & tags.Format<"uuid">>();

  // 2. Create an unauthenticated connection by making a shallow copy but
  //    removing any headers (simulate no Authorization header)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Attempt to delete the task without authentication
  await TestValidator.error(
    "unauthorized deletion of task should throw error",
    async () => {
      await api.functional.jobPerformanceEval.manager.taskGroups.tasks.erase(
        unauthenticatedConnection,
        {
          taskGroupId,
          taskId,
        },
      );
    },
  );
}
