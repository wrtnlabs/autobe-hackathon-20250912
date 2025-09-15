import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDesigner";
import type { ITaskManagementPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPriority";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";
import type { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This E2E test simulates the workflow of a designer creating a status change
 * on a task. It involves TPM user registration, task priority and status
 * creation, project and board setup, task creation, designer user registration
 * and login, and finally posting a status change.
 *
 * It validates all API responses' type safety and business rule expectations,
 * including ID matching and timestamp correctness.
 *
 * The test ensures seamless role switching and real-world user flow simulation.
 */
export async function test_api_task_status_change_creation_designer(
  connection: api.IConnection,
) {
  // 1. TPM user registration and authentication
  const tpmJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "A1b2C3d4!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: tpmJoinBody,
    });
  typia.assert(tpmUser);

  // 2. Create TPM user entity (redundant but per dependencies)
  const tpmEntityBody = {
    email: tpmUser.email,
    password_hash: "hashed_password_placeholder",
    name: tpmUser.name,
  } satisfies ITaskManagementTpm.ICreate;
  const tpmEntity: ITaskManagementTpm =
    await api.functional.taskManagement.tpm.taskManagement.tpms.create(
      connection,
      {
        body: tpmEntityBody,
      },
    );
  typia.assert(tpmEntity);

  // 3. Create a priority
  const priorityCreateBody = {
    code: "high",
    name: "High Priority",
    description: "Tasks that must be addressed as soon as possible.",
  } satisfies ITaskManagementPriority.ICreate;
  const priority: ITaskManagementPriority =
    await api.functional.taskManagement.tpm.taskManagementPriorities.create(
      connection,
      {
        body: priorityCreateBody,
      },
    );
  typia.assert(priority);

  // 4-1. Create initial status
  const statusInitialBody = {
    code: "to_do",
    name: "To Do",
    description: "Initial task status indicating work to be done.",
  } satisfies ITaskManagementTaskStatus.ICreate;
  const statusInitial: ITaskManagementTaskStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      {
        body: statusInitialBody,
      },
    );
  typia.assert(statusInitial);

  // 4-2. Create changed status
  const statusChangedBody = {
    code: "in_progress",
    name: "In Progress",
    description: "Task is currently being worked on.",
  } satisfies ITaskManagementTaskStatus.ICreate;
  const statusChanged: ITaskManagementTaskStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      {
        body: statusChangedBody,
      },
    );
  typia.assert(statusChanged);

  // 5. Create project owned by TPM user
  const projectCreateBody = {
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(6),
    name: "Test Project",
    description: "Project used for status change tests.",
  } satisfies ITaskManagementProject.ICreate;
  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(project);

  // 6. Create board under project
  const boardCreateBody = {
    project_id: project.id,
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(4),
    name: "Main Board",
    description: "Board for main tasks.",
  } satisfies ITaskManagementBoard.ICreate;
  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: boardCreateBody,
    });
  typia.assert(board);

  // 7. Create task
  const taskCreateBody = {
    status_id: statusInitial.id,
    priority_id: priority.id,
    creator_id: tpmUser.id,
    project_id: project.id,
    board_id: board.id,
    title: "Implement status change API integration",
    description: "Task to handle designer status changes on tasks.",
  } satisfies ITaskManagementTask.ICreate;
  const task: ITaskManagementTask =
    await api.functional.taskManagement.tpm.tasks.create(connection, {
      body: taskCreateBody,
    });
  typia.assert(task);

  // 8. Designer user registration and authentication
  const designerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: "hashed_password_designer",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementDesigner.ICreate;
  const designerUser: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.join(connection, {
      body: designerJoinBody,
    });
  typia.assert(designerUser);

  const designerLoginBody = {
    email: designerUser.email,
    password: "A1b2C3d4!",
  } satisfies ITaskManagementDesigner.ILogin;
  await api.functional.auth.designer.login(connection, {
    body: designerLoginBody,
  });

  // 9. Designer creates a status change on the task
  const statusChangeBody = {
    task_id: task.id,
    new_status_id: statusChanged.id,
    changed_at: new Date().toISOString(),
    comment: "Started working on API integration",
  } satisfies ITaskManagementTaskStatusChange.ICreate;
  const statusChange: ITaskManagementTaskStatusChange =
    await api.functional.taskManagement.designer.tasks.statusChanges.create(
      connection,
      {
        taskId: task.id,
        body: statusChangeBody,
      },
    );
  typia.assert(statusChange);

  // Business validations
  TestValidator.equals(
    "Status change task_id matches created task",
    statusChange.task_id,
    task.id,
  );
  TestValidator.equals(
    "Status change new_status_id matches changed status",
    statusChange.new_status_id,
    statusChanged.id,
  );
  TestValidator.predicate(
    "Changed at timestamp is valid ISO string",
    !Number.isNaN(Date.parse(statusChange.changed_at)),
  );
}
