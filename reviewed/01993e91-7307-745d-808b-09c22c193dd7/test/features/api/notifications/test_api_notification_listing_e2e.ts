import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementNotification";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotification";
import type { ITaskManagementPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPriority";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskAssignment";
import type { ITaskManagementTaskManagementRoles } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskManagementRoles";
import type { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";
import type { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * End-to-end test for TPM notifications listing feature.
 *
 * Workflow:
 *
 * 1. Register a TPM user with join API.
 * 2. Login with the TPM user to obtain authorization tokens.
 * 3. Create a Task Management Role for TPM.
 * 4. Create a TPM user entity.
 * 5. Create a project owned by the TPM user.
 * 6. Create a board within the project owned by TPM.
 * 7. Create standard task statuses.
 * 8. Create task priorities.
 * 9. Create a task under the project board, assigned to TPM and with status
 *    and priority.
 * 10. Assign the TPM user to the task.
 * 11. Create task status changes to simulate workflow.
 * 12. Call the notifications listing PATCH API with various search and
 *     pagination parameters.
 * 13. Verify the notifications API returns expected data structure and
 *     contents.
 * 14. Verify edge cases like empty notifications results and unauthorized
 *     attempts.
 */
export async function test_api_notification_listing_e2e(
  connection: api.IConnection,
) {
  // 1. TPM User Registration
  const joinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "StrongPassword123!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const joinedUser = await api.functional.auth.tpm.join(connection, {
    body: joinBody,
  });
  typia.assert(joinedUser);

  // 2. TPM User Login
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies ITaskManagementTpm.ILogin;
  const loggedUser = await api.functional.auth.tpm.login(connection, {
    body: loginBody,
  });
  typia.assert(loggedUser);

  // 3. Create TaskManagementRole for TPM
  const taskManagementRoleBody = {
    code: "TPM",
    name: "Technical Project Manager",
    description: "Role for TPM users",
  } satisfies ITaskManagementTaskManagementRoles.ICreate;
  const taskRole =
    await api.functional.taskManagement.tpm.taskManagementRoles.create(
      connection,
      { body: taskManagementRoleBody },
    );
  typia.assert(taskRole);
  TestValidator.equals("taskRole code should be TPM", taskRole.code, "TPM");

  // 4. Create TPM user entity
  const tpmCreateBody = {
    email: joinBody.email,
    password_hash: joinedUser.password_hash,
    name: joinBody.name,
  } satisfies ITaskManagementTpm.ICreate;
  const tpmUser =
    await api.functional.taskManagement.tpm.taskManagement.tpms.create(
      connection,
      { body: tpmCreateBody },
    );
  typia.assert(tpmUser);
  TestValidator.equals("TPM user email matches", tpmUser.email, joinBody.email);

  // 5. Create a Project owned by TPM user
  const projectBody = {
    owner_id: tpmUser.id,
    code: `prj_${RandomGenerator.alphaNumeric(6)}`,
    name: `Project ${RandomGenerator.name(2)}`,
    description: "Project description for TPM",
  } satisfies ITaskManagementProject.ICreate;
  const project = await api.functional.taskManagement.tpm.projects.create(
    connection,
    { body: projectBody },
  );
  typia.assert(project);
  TestValidator.equals(
    "Project owner id matches TPM user",
    project.owner_id,
    tpmUser.id,
  );

  // 6. Create a Board within the Project
  const boardBody = {
    project_id: project.id,
    owner_id: tpmUser.id,
    code: `bd_${RandomGenerator.alphaNumeric(4)}`,
    name: `Board ${RandomGenerator.name(2)}`,
    description: "Board description",
  } satisfies ITaskManagementBoard.ICreate;
  const board = await api.functional.taskManagement.tpm.projects.boards.create(
    connection,
    { projectId: project.id, body: boardBody },
  );
  typia.assert(board);
  TestValidator.equals(
    "Board project id matches project",
    board.project_id,
    project.id,
  );

  // 7. Create Task Statuses - two states for test: to_do and done
  const toDoStatusBody = {
    code: "to_do",
    name: "To Do",
    description: "Task pending to be done",
  } satisfies ITaskManagementTaskStatus.ICreate;
  const toDoStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      { body: toDoStatusBody },
    );
  typia.assert(toDoStatus);

  const doneStatusBody = {
    code: "done",
    name: "Done",
    description: "Task completed",
  } satisfies ITaskManagementTaskStatus.ICreate;
  const doneStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      { body: doneStatusBody },
    );
  typia.assert(doneStatus);

  // 8. Create Task Priorities - low and high
  const lowPriorityBody = {
    code: "low",
    name: "Low Priority",
    description: "Low priority task",
  } satisfies ITaskManagementPriority.ICreate;
  const lowPriority =
    await api.functional.taskManagement.tpm.taskManagementPriorities.create(
      connection,
      { body: lowPriorityBody },
    );
  typia.assert(lowPriority);

  const highPriorityBody = {
    code: "high",
    name: "High Priority",
    description: "High priority task",
  } satisfies ITaskManagementPriority.ICreate;
  const highPriority =
    await api.functional.taskManagement.tpm.taskManagementPriorities.create(
      connection,
      { body: highPriorityBody },
    );
  typia.assert(highPriority);

  // 9. Create a Task under the Project Board
  const taskBody = {
    status_id: toDoStatus.id,
    priority_id: highPriority.id,
    creator_id: tpmUser.id,
    project_id: project.id,
    board_id: board.id,
    title: "Test Task for Notification",
    description: "This is a task created to generate notifications.",
  } satisfies ITaskManagementTask.ICreate;
  const task = await api.functional.taskManagement.tpm.tasks.create(
    connection,
    { body: taskBody },
  );
  typia.assert(task);
  TestValidator.equals(
    "Task project id matches project",
    task.project_id ?? null,
    project.id,
  );

  // 10. Assign the TPM user to the Task
  const assignmentBody = {
    task_id: task.id,
    assignee_id: tpmUser.id,
  } satisfies ITaskManagementTaskAssignment.ICreate;
  const assignment =
    await api.functional.taskManagement.tpm.tasks.assignments.createAssignment(
      connection,
      { taskId: task.id, body: assignmentBody },
    );
  typia.assert(assignment);
  TestValidator.equals(
    "Assignment assignee matches TPM user",
    assignment.assignee_id,
    tpmUser.id,
  );

  // 11. Create Task Status Change (simulate status change for notification)
  const statusChangeBody = {
    task_id: task.id,
    new_status_id: doneStatus.id,
    changed_at: new Date().toISOString(),
    comment: "Task completed successfully",
  } satisfies ITaskManagementTaskStatusChange.ICreate;
  const statusChange =
    await api.functional.taskManagement.tpm.tasks.statusChanges.create(
      connection,
      { taskId: task.id, body: statusChangeBody },
    );
  typia.assert(statusChange);
  TestValidator.equals(
    "StatusChange task id matches task",
    statusChange.task_id,
    task.id,
  );

  // 12. Call Notifications Listing API - Basic Retrieval
  const notificationRequestBasic = {
    page: 1,
    limit: 10,
  } satisfies ITaskManagementNotification.IRequest;
  const notificationsPage =
    await api.functional.taskManagement.tpm.notifications.index(connection, {
      body: notificationRequestBasic,
    });
  typia.assert(notificationsPage);
  TestValidator.predicate(
    "Notifications returned list is an array",
    Array.isArray(notificationsPage.data),
  );

  // 13. Call Notifications Listing API with Search
  const notificationSearchRequest = {
    search: "Task",
    limit: 5,
    page: 1,
  } satisfies ITaskManagementNotification.IRequest;
  const notificationsSearch =
    await api.functional.taskManagement.tpm.notifications.index(connection, {
      body: notificationSearchRequest,
    });
  typia.assert(notificationsSearch);
  TestValidator.predicate(
    "Notifications search returns array",
    Array.isArray(notificationsSearch.data),
  );

  // 14. Call Notifications Listing API Filtering by Notification Type 'assignment'
  const notificationFilterRequest = {
    notification_type: "assignment",
    page: 1,
    limit: 10,
  } satisfies ITaskManagementNotification.IRequest;
  const notificationsFiltered =
    await api.functional.taskManagement.tpm.notifications.index(connection, {
      body: notificationFilterRequest,
    });
  typia.assert(notificationsFiltered);
  TestValidator.predicate(
    "Notifications filtered by type return array",
    Array.isArray(notificationsFiltered.data),
  );

  // 15. Call Notifications with Read status true and false
  const notificationReadTrueRequest = {
    is_read: true,
    page: 1,
    limit: 10,
  } satisfies ITaskManagementNotification.IRequest;
  const notificationsReadTrue =
    await api.functional.taskManagement.tpm.notifications.index(connection, {
      body: notificationReadTrueRequest,
    });
  typia.assert(notificationsReadTrue);
  TestValidator.predicate(
    "Notifications filtered by is_read true return array",
    Array.isArray(notificationsReadTrue.data),
  );

  const notificationReadFalseRequest = {
    is_read: false,
    page: 1,
    limit: 10,
  } satisfies ITaskManagementNotification.IRequest;
  const notificationsReadFalse =
    await api.functional.taskManagement.tpm.notifications.index(connection, {
      body: notificationReadFalseRequest,
    });
  typia.assert(notificationsReadFalse);
  TestValidator.predicate(
    "Notifications filtered by is_read false return array",
    Array.isArray(notificationsReadFalse.data),
  );

  // 16. Edge Case: Call Notifications with empty page result
  const notificationEmptyPageRequest = {
    page: 9999,
    limit: 10,
  } satisfies ITaskManagementNotification.IRequest;
  const notificationsEmptyPage =
    await api.functional.taskManagement.tpm.notifications.index(connection, {
      body: notificationEmptyPageRequest,
    });
  typia.assert(notificationsEmptyPage);
  TestValidator.equals(
    "Notifications empty page data length zero",
    notificationsEmptyPage.data.length,
    0,
  );

  // 17. Edge Case: Unauthorized access
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized notifications access should fail",
    async () => {
      await api.functional.taskManagement.tpm.notifications.index(
        unauthenticatedConnection,
        { body: notificationRequestBasic },
      );
    },
  );
}
