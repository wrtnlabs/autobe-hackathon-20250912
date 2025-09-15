import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPriority";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";
import type { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * Validates updating a task status change record with proper authorization,
 * covering full setup and teardown scenario.
 *
 * Workflow:
 *
 * 1. TPM user registers and authenticates using /auth/tpm/join, acquiring JWT
 *    tokens.
 * 2. A new task status is created to serve as the updated status in the
 *    record.
 * 3. A new task priority is created for task association.
 * 4. A project is created owned by the TPM user.
 * 5. A board under the project is created.
 * 6. A new task is created using the created board, project, priority, status,
 *    and creator TPM user.
 * 7. An initial status change is created for the task.
 * 8. The status change record is updated with the new task status id.
 * 9. Assert that the update response reflects the new status and updated
 *    timestamps, preserving other data.
 * 10. Verify that errors are raised when attempting update with invalid or
 *     unauthorized data.
 *
 * This test ensures secure and consistent status change updating within TPM
 * authorization context.
 */
export async function test_api_task_status_change_update_with_authorization(
  connection: api.IConnection,
) {
  // 1. TPM user registration and authentication
  const userJoinBody = {
    email: `${RandomGenerator.alphabets(6)}@example.com`,
    password: "StrongP@ssw0rd",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;

  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: userJoinBody });
  typia.assert(tpmUser);

  // 2. Create original task status
  const originalTaskStatusCreateBody = {
    code: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITaskManagementTaskStatus.ICreate;

  const originalStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      { body: originalTaskStatusCreateBody },
    );
  typia.assert(originalStatus);

  // 3. Create new task status for update
  const updateTaskStatusCreateBody = {
    code: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITaskManagementTaskStatus.ICreate;

  const updateStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      { body: updateTaskStatusCreateBody },
    );
  typia.assert(updateStatus);

  // 4. Create task priority
  const priorityCreateBody = {
    code: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITaskManagementPriority.ICreate;

  const priority: ITaskManagementPriority =
    await api.functional.taskManagement.tpm.taskManagementPriorities.create(
      connection,
      { body: priorityCreateBody },
    );
  typia.assert(priority);

  // 5. Create project
  const projectCreateBody = {
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITaskManagementProject.ICreate;

  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(project);

  // 6. Create board
  const boardCreateBody = {
    project_id: project.id,
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ITaskManagementBoard.ICreate;

  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: boardCreateBody,
    });
  typia.assert(board);

  // 7. Create task using original task status
  const taskCreateBody = {
    status_id: originalStatus.id,
    priority_id: priority.id,
    creator_id: tpmUser.id,
    project_id: project.id,
    board_id: board.id,
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 6, wordMax: 10 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ITaskManagementTask.ICreate;

  const task: ITaskManagementTask =
    await api.functional.taskManagement.tpm.tasks.create(connection, {
      body: taskCreateBody,
    });
  typia.assert(task);

  // 8. Create status change record with original status
  const statusChangeCreateBody = {
    task_id: task.id,
    new_status_id: originalStatus.id,
    changed_at: new Date().toISOString(),
    comment: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies ITaskManagementTaskStatusChange.ICreate;

  const statusChange: ITaskManagementTaskStatusChange =
    await api.functional.taskManagement.tpm.tasks.statusChanges.create(
      connection,
      {
        taskId: task.id,
        body: statusChangeCreateBody,
      },
    );
  typia.assert(statusChange);

  // 9. Update the status change record with new status
  const updateBody = {
    new_status_id: updateStatus.id,
    changed_at: new Date(new Date().getTime() + 1000).toISOString(),
    comment: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ITaskManagementTaskStatusChange.IUpdate;

  const updatedStatusChange: ITaskManagementTaskStatusChange =
    await api.functional.taskManagement.tpm.tasks.statusChanges.update(
      connection,
      {
        taskId: task.id,
        statusChangeId: statusChange.id,
        body: updateBody,
      },
    );
  typia.assert(updatedStatusChange);

  // 10. Assertions
  TestValidator.equals(
    "new_status_id is updated",
    updatedStatusChange.new_status_id,
    updateBody.new_status_id,
  );

  TestValidator.predicate(
    "changed_at is later than original",
    new Date(updatedStatusChange.changed_at) >
      new Date(statusChange.changed_at),
  );

  TestValidator.notEquals(
    "comment is updated",
    updatedStatusChange.comment,
    statusChange.comment,
  );

  TestValidator.equals(
    "task_id remains the same",
    updatedStatusChange.task_id,
    statusChange.task_id,
  );

  // 11. Error validation: invalid statusChangeId causes error
  await TestValidator.error(
    "update with invalid statusChangeId should fail",
    async () => {
      await api.functional.taskManagement.tpm.tasks.statusChanges.update(
        connection,
        {
          taskId: task.id,
          statusChangeId: "00000000-0000-0000-0000-000000000000",
          body: {
            new_status_id: updateStatus.id,
          } satisfies ITaskManagementTaskStatusChange.IUpdate,
        },
      );
    },
  );

  // 12. Error validation: invalid taskId causes error
  await TestValidator.error(
    "update with invalid taskId should fail",
    async () => {
      await api.functional.taskManagement.tpm.tasks.statusChanges.update(
        connection,
        {
          taskId: "00000000-0000-0000-0000-000000000000",
          statusChangeId: statusChange.id,
          body: {
            new_status_id: updateStatus.id,
          } satisfies ITaskManagementTaskStatusChange.IUpdate,
        },
      );
    },
  );
}
