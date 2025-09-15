import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";
import type { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";

/**
 * This E2E test covers the successful deletion of a task status change by a
 * PMO user.
 *
 * Workflow:
 *
 * 1. Register and authenticate PMO user via /auth/pmo/join and
 *    /auth/pmo/login.
 * 2. Create prerequisite resources: project, task status, task, initial status
 *    change.
 * 3. Perform the delete operation on the specific task status change with
 *    DELETE
 *    /taskManagement/pmo/tasks/{taskId}/statusChanges/{statusChangeId}.
 * 4. Confirm the deletion by attempting to delete the same status change
 *    again, expecting failure due to non-existence.
 * 5. Also test failure scenarios such as unauthorized access and deleting
 *    non-existent status changes.
 *
 * Business rules verified include role-based authorization and integrity of
 * task status change lifecycle.
 *
 * Success criteria: The status change is removed and not retrievable post
 * deletion.
 */
export async function test_api_task_status_change_delete_pmo_valid(
  connection: api.IConnection,
) {
  // 1. Register PMO user
  const email = typia.random<string & tags.Format<"email">>();
  const password = "Password123!";
  const joinBody = {
    email,
    password,
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;

  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, {
      body: joinBody,
    });
  typia.assert(pmoUser);

  // 2. Login PMO user to get token and be authorized
  const loginBody = {
    email,
    password,
  } satisfies ITaskManagementPmo.ILogin;
  const authorizedPmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.login(connection, {
      body: loginBody,
    });
  typia.assert(authorizedPmoUser);

  // 3. Create task status for task
  const taskStatusBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ITaskManagementTaskStatus.ICreate;
  const taskStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.pmo.taskManagementTaskStatuses.create(
      connection,
      {
        body: taskStatusBody,
      },
    );
  typia.assert(taskStatus);

  // 4. Create project with PMO user as owner
  const projectBody = {
    owner_id: pmoUser.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITaskManagementProject.ICreate;
  const project: ITaskManagementProject =
    await api.functional.taskManagement.pmo.projects.create(connection, {
      body: projectBody,
    });
  typia.assert(project);

  // 5. Create task with necessary links
  // For priority_id, use taskStatus.id as a placeholder since no priority API is provided.
  const taskBody = {
    status_id: taskStatus.id,
    priority_id: taskStatus.id,
    creator_id: pmoUser.id,
    project_id: project.id,
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 9 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 5,
      wordMin: 3,
      wordMax: 7,
    }),
    status_name: taskStatus.name,
    priority_name: taskStatus.name,
  } satisfies ITaskManagementTask.ICreate;
  const task: ITaskManagementTask =
    await api.functional.taskManagement.pmo.tasks.create(connection, {
      body: taskBody,
    });
  typia.assert(task);

  // 6. Create initial task status change
  const now = new Date().toISOString();
  const statusChangeBody = {
    task_id: task.id,
    new_status_id: taskStatus.id,
    changed_at: now,
    comment: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies ITaskManagementTaskStatusChange.ICreate;
  const statusChange: ITaskManagementTaskStatusChange =
    await api.functional.taskManagement.pmo.tasks.statusChanges.create(
      connection,
      {
        taskId: task.id,
        body: statusChangeBody,
      },
    );
  typia.assert(statusChange);

  // 7. Delete the task status change
  await api.functional.taskManagement.pmo.tasks.statusChanges.eraseStatusChange(
    connection,
    {
      taskId: task.id,
      statusChangeId: statusChange.id,
    },
  );

  // 8. Verify deletion by attempting to delete again - expect error
  await TestValidator.error(
    "deleting non-existent status change should fail",
    async () => {
      await api.functional.taskManagement.pmo.tasks.statusChanges.eraseStatusChange(
        connection,
        {
          taskId: task.id,
          statusChangeId: statusChange.id,
        },
      );
    },
  );

  // 9. Test unauthorized deletion by making a new unauthenticated connection
  // Create new connection with empty headers to simulate unauthenticated client
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized deletion should fail", async () => {
    await api.functional.taskManagement.pmo.tasks.statusChanges.eraseStatusChange(
      unauthConnection,
      {
        taskId: task.id,
        statusChangeId: statusChange.id,
      },
    );
  });

  // 10. Test deletion of non-existent random UUID
  await TestValidator.error(
    "deletion of random non-existent status change fails",
    async () => {
      await api.functional.taskManagement.pmo.tasks.statusChanges.eraseStatusChange(
        connection,
        {
          taskId: task.id,
          statusChangeId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
