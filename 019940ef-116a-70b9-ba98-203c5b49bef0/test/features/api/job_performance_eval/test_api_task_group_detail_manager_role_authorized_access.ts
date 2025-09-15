import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IJobPerformanceEvalTaskGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTaskGroup";

export async function test_api_task_group_detail_manager_role_authorized_access(
  connection: api.IConnection,
) {
  // 1. Manager joins
  const managerEmail = typia.random<string & tags.Format<"email">>();
  const managerPassword = "StrongPass123!";

  const manager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: {
        email: managerEmail,
        password: managerPassword,
        name: RandomGenerator.name(),
      } satisfies IJobPerformanceEvalManager.ICreate,
    });
  typia.assert(manager);

  // 2. Valid UUIDs for target jobRoleId and taskGroupId
  const validJobRoleId = typia.random<string & tags.Format<"uuid">>();
  const validTaskGroupId = typia.random<string & tags.Format<"uuid">>();

  // 3. Access task group details with authorized manager
  const taskGroup: IJobPerformanceEvalTaskGroup =
    await api.functional.jobPerformanceEval.manager.jobRoles.taskGroups.at(
      connection,
      {
        jobRoleId: validJobRoleId,
        taskGroupId: validTaskGroupId,
      },
    );
  typia.assert(taskGroup);

  TestValidator.equals(
    "Task group id matches requested taskGroupId",
    taskGroup.id,
    validTaskGroupId,
  );
  TestValidator.equals(
    "Task group job role id matches requested jobRoleId",
    taskGroup.job_role_id,
    validJobRoleId,
  );

  // 4. Negative Test: Unauthorized access
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Unauthorized access to task group details should fail",
    async () => {
      await api.functional.jobPerformanceEval.manager.jobRoles.taskGroups.at(
        unauthConnection,
        {
          jobRoleId: validJobRoleId,
          taskGroupId: validTaskGroupId,
        },
      );
    },
  );

  // 5. Negative Test: Non-existent UUIDs (assuming system gives error)
  // Generate random UUIDs assumed to not exist
  const nonExistentJobRoleId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentTaskGroupId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "Non-existent jobRoleId should cause error",
    async () => {
      await api.functional.jobPerformanceEval.manager.jobRoles.taskGroups.at(
        connection,
        {
          jobRoleId: nonExistentJobRoleId,
          taskGroupId: validTaskGroupId,
        },
      );
    },
  );

  await TestValidator.error(
    "Non-existent taskGroupId should cause error",
    async () => {
      await api.functional.jobPerformanceEval.manager.jobRoles.taskGroups.at(
        connection,
        {
          jobRoleId: validJobRoleId,
          taskGroupId: nonExistentTaskGroupId,
        },
      );
    },
  );
}
