import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPriority";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This end-to-end test validates the full workflow for deleting a task by a
 * Project Management Officer (PMO). It begins by registering a new PMO user and
 * logging in to establish authorization context. Next, it registers a TPM user
 * who will own the project. Then it creates task statuses and priorities using
 * TPM role authorized APIs. A project is created owned by the TPM user,
 * followed by creating a board under this project. Then a task is created with
 * all required fields: status, priority, project and board associations,
 * creator id, title, and optional description. After ensuring the task was
 * successfully created and validated, the test switches to the PMO
 * authorization context and deletes the created task by its ID. It verifies
 * successful deletion with no return body, and that the task no longer exists
 * by attempting to delete the same task again and an arbitrary non-existent
 * task ID, expecting errors. It also attempts deletion without authorization
 * expecting errors. This test ensures authorization enforcement, business logic
 * correctness, and proper resource linkages and cleanup during task deletion by
 * a PMO.
 */
export async function test_api_task_deletion_by_pmo(
  connection: api.IConnection,
) {
  // Register PMO user
  const pmoJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;

  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, { body: pmoJoinInput });
  typia.assert(pmoUser);

  // PMO user login to set auth token automatically
  const pmoLoginInput = {
    email: pmoJoinInput.email,
    password: pmoJoinInput.password,
  } satisfies ITaskManagementPmo.ILogin;
  const pmoUserLogin: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.login(connection, { body: pmoLoginInput });
  typia.assert(pmoUserLogin);

  // Register TPM user
  const tpmJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: tpmJoinInput });
  typia.assert(tpmUser);

  // TPM user login to set auth token automatically
  const tpmLoginInput = {
    email: tpmJoinInput.email,
    password: tpmJoinInput.password,
  } satisfies ITaskManagementTpm.ILogin;
  const tpmUserLogin: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, { body: tpmLoginInput });
  typia.assert(tpmUserLogin);

  // Create Task Status
  const taskStatusCreateBody = {
    code: "to_do",
    name: "To Do",
    description: "Initial status for new tasks",
  } satisfies ITaskManagementTaskStatus.ICreate;
  const taskStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      { body: taskStatusCreateBody },
    );
  typia.assert(taskStatus);

  // Create Task Priority
  const taskPriorityCreateBody = {
    code: "high",
    name: "High",
    description: "High priority tasks",
  } satisfies ITaskManagementPriority.ICreate;
  const taskPriority: ITaskManagementPriority =
    await api.functional.taskManagement.tpm.taskManagementPriorities.create(
      connection,
      { body: taskPriorityCreateBody },
    );
  typia.assert(taskPriority);

  // Create Project
  const projectCreateBody = {
    owner_id: tpmUser.id,
    code: "proj1",
    name: "Project One",
    description: "Project for testing task deletion",
  } satisfies ITaskManagementProject.ICreate;
  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(project);

  // Create Board under Project
  const boardCreateBody = {
    owner_id: tpmUser.id,
    project_id: project.id,
    code: "board1",
    name: "Board One",
    description: "Board for tasks",
  } satisfies ITaskManagementBoard.ICreate;
  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: boardCreateBody,
    });
  typia.assert(board);

  // Create Task with all required fields
  const taskCreateBody = {
    status_id: taskStatus.id,
    priority_id: taskPriority.id,
    creator_id: tpmUser.id,
    project_id: project.id,
    board_id: board.id,
    title: "Test Task",
    description: "Task created for deletion test",
    status_name: taskStatus.name,
    priority_name: taskPriority.name,
    due_date: new Date(Date.now() + 86400000).toISOString(),
  } satisfies ITaskManagementTask.ICreate;
  const task: ITaskManagementTask =
    await api.functional.taskManagement.tpm.tasks.create(connection, {
      body: taskCreateBody,
    });
  typia.assert(task);

  // Switch context to PMO user: login resets token
  await api.functional.auth.pmo.login(connection, { body: pmoLoginInput });

  // Delete the task by PMO
  await api.functional.taskManagement.pmo.tasks.eraseTask(connection, {
    taskId: task.id,
  });

  // Attempt to delete again: expect error
  await TestValidator.error("delete non-existent task fails", async () => {
    await api.functional.taskManagement.pmo.tasks.eraseTask(connection, {
      taskId: task.id,
    });
  });

  // Attempt to delete with a random non-existent UUID
  await TestValidator.error("delete with invalid UUID fails", async () => {
    await api.functional.taskManagement.pmo.tasks.eraseTask(connection, {
      taskId: typia.random<string & tags.Format<"uuid">>(),
    });
  });

  // Simulate delete without authorization by logging out (empty headers)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error("delete task without auth fails", async () => {
    await api.functional.taskManagement.pmo.tasks.eraseTask(unauthConnection, {
      taskId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
}
