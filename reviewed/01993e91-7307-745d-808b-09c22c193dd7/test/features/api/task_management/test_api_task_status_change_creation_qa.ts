import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPriority";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";
import type { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * E2E test validating the creation of a task status change by a QA user.
 *
 * This test covers the entire flow from multi-role user signups, TPM user
 * and entity creations (project, board, task statuses, priorities, task),
 * to role switching and creating a status change for the task by a QA
 * user.
 *
 * The test ensures data correctness, authorization behavior, and API schema
 * compliance through end-to-end scenario validation.
 *
 * Steps:
 *
 * 1. Register and authenticate a QA user.
 * 2. Register and authenticate a TPM user.
 * 3. Create TPM user entity.
 * 4. Create project owned by TPM user.
 * 5. Create board under the project.
 * 6. Create two task statuses: initial and new.
 * 7. Create a priority level.
 * 8. Create a task with initial status and priority.
 * 9. Authenticate as the QA user.
 * 10. Create a task status change record as the QA user.
 * 11. Validate that status change record references correct task and status.
 */
export async function test_api_task_status_change_creation_qa(
  connection: api.IConnection,
) {
  // 1. Register QA user and authenticate
  const qaJoinBody = {
    email: RandomGenerator.alphaNumeric(8) + "@test.com",
    password_hash: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementQa.ICreate;

  const qaUser: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.join(connection, { body: qaJoinBody });
  typia.assert(qaUser);

  // 2. Register TPM user for task creation
  const tpmJoinBody: ITaskManagementTpm.IJoin = {
    email: RandomGenerator.alphaNumeric(8) + "@test.com",
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
  };
  const tpmUserAuth: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: tpmJoinBody });
  typia.assert(tpmUserAuth);

  // 3. Create TPM user entity
  const tpmCreateBody: ITaskManagementTpm.ICreate = {
    email: tpmJoinBody.email,
    password_hash: tpmJoinBody.password,
    name: tpmJoinBody.name,
  };
  const tpmUser: ITaskManagementTpm =
    await api.functional.taskManagement.tpm.taskManagement.tpms.create(
      connection,
      { body: tpmCreateBody },
    );
  typia.assert(tpmUser);

  // 4. Create project entity
  const projectCreateBody: ITaskManagementProject.ICreate = {
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    description: null,
  };
  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(project);

  // 5. Create board under the project
  const boardCreateBody: ITaskManagementBoard.ICreate = {
    project_id: project.id,
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(5),
    name: RandomGenerator.name(),
    description: null,
  };
  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: boardCreateBody,
    });
  typia.assert(board);

  // 6. Create initial and new task statuses
  const initialStatusBody: ITaskManagementTaskStatus.ICreate = {
    code: "init",
    name: "Initial",
    description: null,
  };
  const initialStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      { body: initialStatusBody },
    );
  typia.assert(initialStatus);

  const newStatusBody: ITaskManagementTaskStatus.ICreate = {
    code: "in_progress",
    name: "In Progress",
    description: null,
  };
  const newStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      { body: newStatusBody },
    );
  typia.assert(newStatus);

  // 7. Create task priority
  const priorityBody: ITaskManagementPriority.ICreate = {
    code: "medium",
    name: "Medium",
    description: null,
  };
  const priority: ITaskManagementPriority =
    await api.functional.taskManagement.tpm.taskManagementPriorities.create(
      connection,
      { body: priorityBody },
    );
  typia.assert(priority);

  // 8. Create a task record
  const taskBody: ITaskManagementTask.ICreate = {
    status_id: initialStatus.id,
    priority_id: priority.id,
    creator_id: tpmUser.id,
    project_id: project.id,
    board_id: board.id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: null,
    status_name: initialStatus.name,
    priority_name: priority.name,
    due_date: null,
  };
  const task: ITaskManagementTask =
    await api.functional.taskManagement.tpm.tasks.create(connection, {
      body: taskBody,
    });
  typia.assert(task);

  // 9. QA login for role switch
  await api.functional.auth.qa.login(connection, {
    body: {
      email: qaJoinBody.email,
      password: qaJoinBody.password_hash,
    } satisfies ITaskManagementQa.ILogin,
  });

  // 10. Create task status change as QA user
  const statusChangeBody: ITaskManagementTaskStatusChange.ICreate = {
    task_id: task.id,
    new_status_id: newStatus.id,
    changed_at: new Date().toISOString(),
    comment: "Status changed by QA",
  };
  const statusChange: ITaskManagementTaskStatusChange =
    await api.functional.taskManagement.qa.tasks.statusChanges.create(
      connection,
      {
        taskId: task.id,
        body: statusChangeBody,
      },
    );
  typia.assert(statusChange);

  // Validate the created status change belongs to correct task and status
  TestValidator.equals("task ID matches", statusChange.task_id, task.id);
  TestValidator.equals(
    "new status ID matches",
    statusChange.new_status_id,
    newStatus.id,
  );
  TestValidator.predicate(
    "changed_at is valid ISO datetime",
    !!statusChange.changed_at,
  );
}
