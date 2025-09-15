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
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

export async function test_api_task_management_tpm_retrieve_task_details(
  connection: api.IConnection,
) {
  // 1. Register a new TPM user
  const joinBody = {
    email: `tpm_user_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "StrongP@ssword123",
    name: RandomGenerator.name(2),
  } satisfies ITaskManagementTpm.IJoin;
  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: joinBody,
    });
  typia.assert(tpmUser);

  // 2. Login the TPM user
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies ITaskManagementTpm.ILogin;
  const loggedInUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInUser);

  // 3. Create Task Status
  const taskStatusBody = {
    code: `status_${RandomGenerator.alphaNumeric(6)}`,
    name: `Status ${RandomGenerator.name(1)}`,
    description: `Description ${RandomGenerator.paragraph({ sentences: 2 })}`,
  } satisfies ITaskManagementTaskStatus.ICreate;
  const taskStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      { body: taskStatusBody },
    );
  typia.assert(taskStatus);

  // 4. Create Task Priority
  const taskPriorityBody = {
    code: `priority_${RandomGenerator.alphaNumeric(6)}`,
    name: `Priority ${RandomGenerator.name(1)}`,
    description: `Description ${RandomGenerator.paragraph({ sentences: 2 })}`,
  } satisfies ITaskManagementPriority.ICreate;
  const taskPriority: ITaskManagementPriority =
    await api.functional.taskManagement.tpm.taskManagementPriorities.create(
      connection,
      { body: taskPriorityBody },
    );
  typia.assert(taskPriority);

  // 5. Create Project
  const projectBody = {
    owner_id: tpmUser.id,
    code: `proj_${RandomGenerator.alphaNumeric(6)}`,
    name: `Project ${RandomGenerator.name(2)}`,
    description: `Description ${RandomGenerator.paragraph({ sentences: 3 })}`,
  } satisfies ITaskManagementProject.ICreate;
  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: projectBody,
    });
  typia.assert(project);

  // 6. Create Board under the Project
  const boardBody = {
    project_id: project.id,
    owner_id: tpmUser.id,
    code: `board_${RandomGenerator.alphaNumeric(6)}`,
    name: `Board ${RandomGenerator.name(2)}`,
    description: `Description ${RandomGenerator.paragraph({ sentences: 2 })}`,
  } satisfies ITaskManagementBoard.ICreate;
  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: boardBody,
    });
  typia.assert(board);

  // 7. Create Task
  const taskCreateBody = {
    status_id: taskStatus.id,
    priority_id: taskPriority.id,
    creator_id: tpmUser.id,
    project_id: project.id,
    board_id: board.id,
    title: `Task Title ${RandomGenerator.paragraph({ sentences: 1 })}`,
    description: `Task Description ${RandomGenerator.paragraph({ sentences: 3 })}`,
    due_date: new Date(Date.now() + 86400000).toISOString(), // due next day
  } satisfies ITaskManagementTask.ICreate;
  const task: ITaskManagementTask =
    await api.functional.taskManagement.tpm.tasks.create(connection, {
      body: taskCreateBody,
    });
  typia.assert(task);

  // 8. Retrieve Task Details
  const retrievedTask: ITaskManagementTask =
    await api.functional.taskManagement.tpm.tasks.at(connection, {
      taskId: task.id,
    });
  typia.assert(retrievedTask);

  // Validation
  TestValidator.equals("Task IDs must match", retrievedTask.id, task.id);
  TestValidator.equals(
    "Task Status IDs must match",
    retrievedTask.status_id,
    taskStatus.id,
  );
  TestValidator.equals(
    "Task Priority IDs must match",
    retrievedTask.priority_id,
    taskPriority.id,
  );
  TestValidator.equals(
    "Task Creator IDs must match",
    retrievedTask.creator_id,
    tpmUser.id,
  );
  TestValidator.equals(
    "Task Project IDs must match",
    retrievedTask.project_id,
    project.id,
  );
  TestValidator.equals(
    "Task Board IDs must match",
    retrievedTask.board_id,
    board.id,
  );
  TestValidator.equals(
    "Task Titles must match",
    retrievedTask.title,
    taskCreateBody.title,
  );
  TestValidator.equals(
    "Task Descriptions must match",
    retrievedTask.description,
    taskCreateBody.description,
  );
  TestValidator.equals(
    "Task Due Dates must match",
    retrievedTask.due_date,
    taskCreateBody.due_date,
  );
  TestValidator.predicate(
    "Task created_at timestamp exists",
    typeof retrievedTask.created_at === "string" &&
      retrievedTask.created_at.length > 0,
  );
  TestValidator.predicate(
    "Task updated_at timestamp exists",
    typeof retrievedTask.updated_at === "string" &&
      retrievedTask.updated_at.length > 0,
  );
}
