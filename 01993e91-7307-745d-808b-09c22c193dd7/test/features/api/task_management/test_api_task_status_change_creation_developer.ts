import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";
import type { ITaskManagementPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPriority";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";
import type { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This test scenario validates the complete workflow of creating a task status
 * change by a developer user assigned to a specific task, including TPM user
 * and developer user registrations, project and board creation, task statuses,
 * priority, task creation, and the status change creation. It focuses on
 * verifying authorization boundaries, relationship consistency, and realistic
 * data values. All API responses are asserted to ensure type safety, with
 * detailed validation using TestValidator for business semantics.
 */
export async function test_api_task_status_change_creation_developer(
  connection: api.IConnection,
) {
  // 1-2. TPM user registration and authentication
  const tpmJoinBody = {
    email: `${RandomGenerator.alphaNumeric(10)}@example.com`,
    password: "Passw0rd!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;

  const tpmAuth = await api.functional.auth.tpm.join(connection, {
    body: tpmJoinBody,
  });
  typia.assert(tpmAuth);

  // 3. Developer user registration and authentication
  const devJoinBody = {
    email: `${RandomGenerator.alphaNumeric(10)}@example.com`,
    password_hash: "Passw0rd!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementDeveloper.ICreate;

  const devAuth = await api.functional.auth.developer.join(connection, {
    body: devJoinBody,
  });
  typia.assert(devAuth);

  // 4. TPM user entity creation
  const tpmCreateBody = {
    email: tpmJoinBody.email,
    password_hash: tpmJoinBody.password,
    name: tpmJoinBody.name,
  } satisfies ITaskManagementTpm.ICreate;

  const tpmEntity =
    await api.functional.taskManagement.tpm.taskManagement.tpms.create(
      connection,
      {
        body: tpmCreateBody,
      },
    );
  typia.assert(tpmEntity);

  // 5. Create Project
  const projectCreateBody = {
    owner_id: tpmEntity.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: null,
  } satisfies ITaskManagementProject.ICreate;

  const project = await api.functional.taskManagement.tpm.projects.create(
    connection,
    {
      body: projectCreateBody,
    },
  );
  typia.assert(project);

  // 6. Create Board in project
  const boardCreateBody = {
    project_id: project.id,
    owner_id: tpmEntity.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    description: null,
  } satisfies ITaskManagementBoard.ICreate;

  const board = await api.functional.taskManagement.tpm.projects.boards.create(
    connection,
    {
      projectId: project.id,
      body: boardCreateBody,
    },
  );
  typia.assert(board);

  // 7. Create Initial and New Task Status entries
  const initialStatusBody = {
    code: "to_do",
    name: "To Do",
    description: "Initial status",
  } satisfies ITaskManagementTaskStatus.ICreate;

  const newStatusBody = {
    code: "in_progress",
    name: "In Progress",
    description: "Task is being worked on",
  } satisfies ITaskManagementTaskStatus.ICreate;

  const initialStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      {
        body: initialStatusBody,
      },
    );
  typia.assert(initialStatus);

  const newStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      {
        body: newStatusBody,
      },
    );
  typia.assert(newStatus);

  // 8. Create Task Priority
  const priorityBody = {
    code: "medium",
    name: "Medium",
    description: "Medium priority",
  } satisfies ITaskManagementPriority.ICreate;

  const priority =
    await api.functional.taskManagement.tpm.taskManagementPriorities.create(
      connection,
      {
        body: priorityBody,
      },
    );
  typia.assert(priority);

  // 9. Create Task assigned to TPM user, linked to project, board, with initial status and priority
  const taskCreationBody = {
    status_id: initialStatus.id,
    priority_id: priority.id,
    creator_id: tpmEntity.id,
    project_id: project.id,
    board_id: board.id,
    title: "Implement feature X",
    description: "Detailed description of feature X",
    status_name: initialStatus.name,
    priority_name: priority.name,
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  } satisfies ITaskManagementTask.ICreate;

  const task = await api.functional.taskManagement.tpm.tasks.create(
    connection,
    {
      body: taskCreationBody,
    },
  );
  typia.assert(task);

  // 10. Developer authenticates
  await api.functional.auth.developer.login(connection, {
    body: {
      email: devJoinBody.email,
      password: "Passw0rd!",
    } satisfies ITaskManagementDeveloper.ILogin,
  });

  // 11. Developer creates status change for the task
  const statusChangeBody = {
    task_id: task.id,
    new_status_id: newStatus.id,
    changed_at: new Date().toISOString(),
    comment: "Started working on feature X",
  } satisfies ITaskManagementTaskStatusChange.ICreate;

  const statusChange =
    await api.functional.taskManagement.developer.tasks.statusChanges.create(
      connection,
      {
        taskId: task.id,
        body: statusChangeBody,
      },
    );
  typia.assert(statusChange);

  // Validate key properties
  TestValidator.equals("taskId matches", statusChange.task_id, task.id);
  TestValidator.equals(
    "newStatusId matches",
    statusChange.new_status_id,
    newStatus.id,
  );
  TestValidator.predicate(
    "changedAt is ISO string",
    typeof statusChange.changed_at === "string" &&
      statusChange.changed_at.length > 0,
  );
  TestValidator.equals(
    "comment matches",
    statusChange.comment,
    "Started working on feature X",
  );
}
