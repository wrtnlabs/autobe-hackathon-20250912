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
import type { ITaskManagementTaskManagementRoles } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskManagementRoles";
import type { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";
import type { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

export async function test_api_task_status_change_detail_retrieval_with_dependencies(
  connection: api.IConnection,
) {
  // 1. Register a TPM user
  const tpmUserJoinBody = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password: "securepassword",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: tpmUserJoinBody,
    });
  typia.assert(tpmUser);

  // 2. TPM user login
  const tpmUserLoginBody = {
    email: tpmUser.email,
    password: "securepassword",
  } satisfies ITaskManagementTpm.ILogin;
  const tpmUserLoggedIn: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, {
      body: tpmUserLoginBody,
    });
  typia.assert(tpmUserLoggedIn);

  // 3. Create TaskManagementRole
  const taskManagementRoleCreate = {
    code: "TPM",
    name: "Technical Project Manager",
    description: "Role for TPM users",
  } satisfies ITaskManagementTaskManagementRoles.ICreate;
  const taskManagementRole: ITaskManagementTaskManagementRoles =
    await api.functional.taskManagement.tpm.taskManagementRoles.create(
      connection,
      { body: taskManagementRoleCreate },
    );
  typia.assert(taskManagementRole);

  // 4. Create two TaskManagementTaskStatuses (initial and new)
  const initialStatusCreate = {
    code: "to_do",
    name: "To Do",
    description: "Initial task status",
  } satisfies ITaskManagementTaskStatus.ICreate;
  const initialStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      { body: initialStatusCreate },
    );
  typia.assert(initialStatus);

  const newStatusCreate = {
    code: "in_progress",
    name: "In Progress",
    description: "Task status when work started",
  } satisfies ITaskManagementTaskStatus.ICreate;
  const newStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      { body: newStatusCreate },
    );
  typia.assert(newStatus);

  // 5. Register PMO user
  const pmoUserJoinBody = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password: "securepassword",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;
  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, {
      body: pmoUserJoinBody,
    });
  typia.assert(pmoUser);

  // 6. PMO user login
  const pmoUserLoginBody = {
    email: pmoUser.email,
    password: "securepassword",
  } satisfies ITaskManagementPmo.ILogin;
  const pmoUserLoggedIn: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.login(connection, {
      body: pmoUserLoginBody,
    });
  typia.assert(pmoUserLoggedIn);

  // Create TaskManagementPriority with PMO authorization
  const priorityCreate = {
    code: "medium",
    name: "Medium Priority",
    description: "Default medium task priority",
  } satisfies ITaskManagementPriority.ICreate;
  const priority: ITaskManagementPriority =
    await api.functional.taskManagement.pmo.taskManagementPriorities.create(
      connection,
      { body: priorityCreate },
    );
  typia.assert(priority);

  // 7. Switch back to TPM user login to get appropriate tokens
  const tpmUserRelogin: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, {
      body: tpmUserLoginBody,
    });
  typia.assert(tpmUserRelogin);

  // 8. Create a Project owned by TPM user
  const projectCreate = {
    owner_id: tpmUserRelogin.id,
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    description: "Sample project for testing",
  } satisfies ITaskManagementProject.ICreate;
  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: projectCreate,
    });
  typia.assert(project);

  // 9. Create a Board in the Project
  const boardCreate = {
    project_id: project.id,
    owner_id: tpmUserRelogin.id,
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    description: "Sample board for testing",
  } satisfies ITaskManagementBoard.ICreate;
  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: boardCreate,
    });
  typia.assert(board);

  // 10. Create a Task with status, priority, TPM creator, project and board
  const taskCreate = {
    status_id: initialStatus.id,
    priority_id: priority.id,
    creator_id: tpmUserRelogin.id,
    project_id: project.id,
    board_id: board.id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies ITaskManagementTask.ICreate;
  const task: ITaskManagementTask =
    await api.functional.taskManagement.tpm.tasks.create(connection, {
      body: taskCreate,
    });
  typia.assert(task);

  // 11. Create a TaskStatusChange record for the Task
  const statusChangeCreate = {
    task_id: task.id,
    new_status_id: newStatus.id,
    changed_at: new Date().toISOString(),
    comment: "Started working on the task",
  } satisfies ITaskManagementTaskStatusChange.ICreate;
  const statusChange: ITaskManagementTaskStatusChange =
    await api.functional.taskManagement.tpm.tasks.statusChanges.create(
      connection,
      {
        taskId: task.id,
        body: statusChangeCreate,
      },
    );
  typia.assert(statusChange);

  // 12. Retrieve the TaskStatusChange detail by GET endpoint
  const fetchedStatusChange: ITaskManagementTaskStatusChange =
    await api.functional.taskManagement.tpm.tasks.statusChanges.at(connection, {
      taskId: task.id,
      statusChangeId: statusChange.id,
    });
  typia.assert(fetchedStatusChange);

  // Validate GET response matches the created status change
  TestValidator.equals(
    "Task status change ID",
    fetchedStatusChange.id,
    statusChange.id,
  );
  TestValidator.equals(
    "Task ID of status change",
    fetchedStatusChange.task_id,
    task.id,
  );
  TestValidator.equals(
    "New status ID in status change",
    fetchedStatusChange.new_status_id,
    newStatus.id,
  );
  TestValidator.equals(
    "Status change comment",
    fetchedStatusChange.comment ?? null,
    statusChangeCreate.comment ?? null,
  );
}
