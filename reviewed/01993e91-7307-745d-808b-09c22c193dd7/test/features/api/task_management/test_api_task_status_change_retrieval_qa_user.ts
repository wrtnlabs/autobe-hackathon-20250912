import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPriority";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";
import type { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";

/**
 * This test scenario verifies that a QA user can retrieve detailed information
 * about a specific task status change associated with a particular task. First,
 * a QA user registers via /auth/qa/join, then logs in at /auth/qa/login to
 * obtain authentication tokens. Next, a project is created and a task is
 * created within that project with initial status and priority. The QA user
 * will then create a status change for this task to a new valid status.
 * Finally, the QA user retrieves the detailed status change information using
 * the GET /taskManagement/qa/tasks/{taskId}/statusChanges/{statusChangeId}
 * endpoint. The test validates all response fields including status ID,
 * commenter, timestamps, and comment text, and verifies error responses for
 * invalid IDs or unauthorized access.
 */
export async function test_api_task_status_change_retrieval_qa_user(
  connection: api.IConnection,
) {
  // 1. QA User registration and login
  const qaEmail = typia.random<string & tags.Format<"email">>();
  const qaPassword = RandomGenerator.alphaNumeric(12);
  const qaUser: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.join(connection, {
      body: {
        email: qaEmail,
        password_hash: qaPassword,
        name: RandomGenerator.name(2),
      } satisfies ITaskManagementQa.ICreate,
    });
  typia.assert(qaUser);

  const qaLogin: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.login(connection, {
      body: {
        email: qaEmail,
        password: qaPassword,
      } satisfies ITaskManagementQa.ILogin,
    });
  typia.assert(qaLogin);

  // 2. PMO User registration and login for project and status management
  const pmoEmail = typia.random<string & tags.Format<"email">>();
  const pmoPassword = RandomGenerator.alphaNumeric(12);
  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, {
      body: {
        email: pmoEmail,
        password: pmoPassword,
        name: RandomGenerator.name(2),
      } satisfies ITaskManagementPmo.IJoin,
    });
  typia.assert(pmoUser);

  const pmoLogin: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.login(connection, {
      body: {
        email: pmoEmail,
        password: pmoPassword,
      } satisfies ITaskManagementPmo.ILogin,
    });
  typia.assert(pmoLogin);

  // 3. PMO creates a project
  const project: ITaskManagementProject =
    await api.functional.taskManagement.pmo.projects.create(connection, {
      body: {
        owner_id: pmoUser.id,
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ITaskManagementProject.ICreate,
    });
  typia.assert(project);

  // 4. PMO creates initial task status
  const initialStatusCode = `to_do`;
  const initialStatusName = `To Do`;
  const initialStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.pmo.taskManagementTaskStatuses.create(
      connection,
      {
        body: {
          code: initialStatusCode,
          name: initialStatusName,
          description: "Initial task status",
        } satisfies ITaskManagementTaskStatus.ICreate,
      },
    );
  typia.assert(initialStatus);

  // 5. PMO creates new task status for status change
  const newStatusCode = `in_progress`;
  const newStatusName = `In Progress`;
  const newStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.pmo.taskManagementTaskStatuses.create(
      connection,
      {
        body: {
          code: newStatusCode,
          name: newStatusName,
          description: "Task is currently in progress",
        } satisfies ITaskManagementTaskStatus.ICreate,
      },
    );
  typia.assert(newStatus);

  // 6. PMO creates a priority
  const priorityCode = `medium`;
  const priorityName = `Medium`;
  const priority: ITaskManagementPriority =
    await api.functional.taskManagement.pmo.taskManagementPriorities.create(
      connection,
      {
        body: {
          code: priorityCode,
          name: priorityName,
          description: "Medium level priority",
        } satisfies ITaskManagementPriority.ICreate,
      },
    );
  typia.assert(priority);

  // 7. PMO creates a task in the project with initial status and priority, creator is PMO user
  const taskTitle = RandomGenerator.paragraph({ sentences: 4 });
  const taskDescription = RandomGenerator.content({ paragraphs: 2 });
  const task: ITaskManagementTask =
    await api.functional.taskManagement.pmo.tasks.create(connection, {
      body: {
        status_id: initialStatus.id,
        priority_id: priority.id,
        creator_id: pmoUser.id,
        project_id: project.id,
        board_id: null,
        title: taskTitle,
        description: taskDescription,
        status_name: initialStatus.name,
        priority_name: priority.name,
        due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      } satisfies ITaskManagementTask.ICreate,
    });
  typia.assert(task);

  // 8. QA user creates a status change for the task to the new status
  const statusChangeComment = RandomGenerator.paragraph({ sentences: 3 });
  const statusChangeTime = new Date().toISOString();
  const statusChange: ITaskManagementTaskStatusChange =
    await api.functional.taskManagement.qa.tasks.statusChanges.create(
      connection,
      {
        taskId: task.id,
        body: {
          task_id: task.id,
          new_status_id: newStatus.id,
          changed_at: statusChangeTime,
          comment: statusChangeComment,
        } satisfies ITaskManagementTaskStatusChange.ICreate,
      },
    );
  typia.assert(statusChange);

  // 9. QA user retrieves the detailed status change information
  const readChange: ITaskManagementTaskStatusChange =
    await api.functional.taskManagement.qa.tasks.statusChanges.at(connection, {
      taskId: task.id,
      statusChangeId: statusChange.id,
    });
  typia.assert(readChange);

  TestValidator.equals("taskId matches", readChange.task_id, task.id);
  TestValidator.equals(
    "statusChangeId matches",
    readChange.id,
    statusChange.id,
  );
  TestValidator.equals(
    "newStatusId matches",
    readChange.new_status_id,
    newStatus.id,
  );
  TestValidator.equals(
    "changedAt matches",
    readChange.changed_at,
    statusChangeTime,
  );
  TestValidator.equals(
    "statusChange comment matches",
    readChange.comment,
    statusChangeComment,
  );

  // 10. Error scenarios: invalid IDs
  await TestValidator.error("invalid taskId fails", async () => {
    await api.functional.taskManagement.qa.tasks.statusChanges.at(connection, {
      taskId: typia.random<string & tags.Format<"uuid">>(),
      statusChangeId: statusChange.id,
    });
  });

  await TestValidator.error("invalid statusChangeId fails", async () => {
    await api.functional.taskManagement.qa.tasks.statusChanges.at(connection, {
      taskId: task.id,
      statusChangeId: typia.random<string & tags.Format<"uuid">>(),
    });
  });

  // 11. Error scenario: unauthorized access (simulate with PMO login and attempt QA endpoint)
  await api.functional.auth.pmo.login(connection, {
    body: {
      email: pmoEmail,
      password: pmoPassword,
    } satisfies ITaskManagementPmo.ILogin,
  });

  await TestValidator.error(
    "unauthorized PMO cannot access QA status change",
    async () => {
      await api.functional.taskManagement.qa.tasks.statusChanges.at(
        connection,
        {
          taskId: task.id,
          statusChangeId: statusChange.id,
        },
      );
    },
  );
}
