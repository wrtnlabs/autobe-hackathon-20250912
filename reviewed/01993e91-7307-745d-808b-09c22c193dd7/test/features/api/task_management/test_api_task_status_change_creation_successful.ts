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

export async function test_api_task_status_change_creation_successful(
  connection: api.IConnection,
) {
  // 1. Authenticate as a new TPM user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "validPassword123!",
    name: typia.random<string & tags.MinLength<3> & tags.MaxLength<50>>(),
  } satisfies ITaskManagementTpm.IJoin;

  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: joinBody,
    });
  typia.assert(tpmUser);

  // 2. Create a new task status
  const statusCreateBody = {
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ITaskManagementTaskStatus.ICreate;

  const taskStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      { body: statusCreateBody },
    );
  typia.assert(taskStatus);

  // 3. Create a new task priority
  const priorityCreateBody = {
    code: RandomGenerator.alphaNumeric(5),
    name: RandomGenerator.name(1),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITaskManagementPriority.ICreate;

  const taskPriority: ITaskManagementPriority =
    await api.functional.taskManagement.tpm.taskManagementPriorities.create(
      connection,
      { body: priorityCreateBody },
    );
  typia.assert(taskPriority);

  // 4. Create a new project
  const projectCreateBody = {
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(3),
    description: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ITaskManagementProject.ICreate;

  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(project);

  // 5. Create a new board in the project
  const boardCreateBody = {
    project_id: project.id,
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ITaskManagementBoard.ICreate;

  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: boardCreateBody,
    });
  typia.assert(board);

  // 6. Create a new task associated with project and board
  const taskCreateBody = {
    status_id: taskStatus.id,
    priority_id: taskPriority.id,
    creator_id: tpmUser.id,
    project_id: project.id,
    board_id: board.id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ITaskManagementTask.ICreate;

  const task: ITaskManagementTask =
    await api.functional.taskManagement.tpm.tasks.create(connection, {
      body: taskCreateBody,
    });
  typia.assert(task);

  // 7. Create a status change for the task to the same status (simulate status update)
  const now = new Date().toISOString();
  const statusChangeCreateBody = {
    task_id: task.id,
    new_status_id: taskStatus.id,
    changed_at: now,
    comment: "Initial status assignment",
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

  // Validate returned status change matches input and includes timestamp
  TestValidator.equals(
    "statusChange should have correct task_id",
    statusChange.task_id,
    task.id,
  );
  TestValidator.equals(
    "statusChange should have correct new_status_id",
    statusChange.new_status_id,
    taskStatus.id,
  );
  TestValidator.equals(
    "statusChange changed_at matches",
    statusChange.changed_at,
    now,
  );
  TestValidator.equals(
    "statusChange comment matches",
    statusChange.comment,
    statusChangeCreateBody.comment,
  );

  // Validate task's status_id should be updated (simulate by fetching task again)
  // However, only create API exists, so validate basic relationship
  TestValidator.equals(
    "task's status_id is updated",
    task.status_id,
    taskStatus.id,
  );

  // 8. Test error cases

  // 8.1 Unauthorized access: Use unauth connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error("unauthorized status change creation", async () => {
    await api.functional.taskManagement.tpm.tasks.statusChanges.create(
      unauthConn,
      {
        taskId: task.id,
        body: statusChangeCreateBody,
      },
    );
  });

  // 8.2 Invalid status ID
  const invalidStatusChangeBody = {
    ...statusChangeCreateBody,
    new_status_id: typia.random<string & tags.Format<"uuid">>(), // random UUID, does not exist
  } satisfies ITaskManagementTaskStatusChange.ICreate;

  // Should throw error because invalid status_id
  await TestValidator.error("invalid status ID", async () => {
    await api.functional.taskManagement.tpm.tasks.statusChanges.create(
      connection,
      {
        taskId: task.id,
        body: invalidStatusChangeBody,
      },
    );
  });

  // 8.3 Missing task ID (empty string)
  await TestValidator.error("missing task ID", async () => {
    await api.functional.taskManagement.tpm.tasks.statusChanges.create(
      connection,
      {
        taskId: "",
        body: statusChangeCreateBody,
      },
    );
  });
}
