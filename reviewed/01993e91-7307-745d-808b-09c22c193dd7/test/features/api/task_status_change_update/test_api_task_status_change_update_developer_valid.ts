import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";
import type { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";

/**
 * End-to-end test for updating a task status change by a Developer user.
 *
 * This test covers the full workflow of registering and authenticating a
 * Developer user, creating necessary PMO-managed resources such as task
 * statuses, projects, and tasks, then creating and subsequently updating a
 * status change record for the Developer's task.
 *
 * Success and failure scenarios are validated, including authorization, invalid
 * identifiers, and referential integrity enforcement.
 */
export async function test_api_task_status_change_update_developer_valid(
  connection: api.IConnection,
) {
  // 1. Developer registration and login
  const devEmail: string = typia.random<string & tags.Format<"email">>();
  const devPassword: string = "dev-password-1234";
  const devName: string = RandomGenerator.name();
  const developer: ITaskManagementDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: {
        email: devEmail,
        password_hash: devPassword,
        name: devName,
        deleted_at: null,
      } satisfies ITaskManagementDeveloper.ICreate,
    });
  typia.assert(developer);

  await api.functional.auth.developer.login(connection, {
    body: {
      email: devEmail,
      password: devPassword,
    } satisfies ITaskManagementDeveloper.ILogin,
  });

  // 2. PMO registration and login for setup
  const pmoEmail: string = typia.random<string & tags.Format<"email">>();
  const pmoPassword: string = "pmo-password-1234";
  const pmoName: string = RandomGenerator.name();
  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, {
      body: {
        email: pmoEmail,
        password: pmoPassword,
        name: pmoName,
      } satisfies ITaskManagementPmo.IJoin,
    });
  typia.assert(pmoUser);

  await api.functional.auth.pmo.login(connection, {
    body: {
      email: pmoEmail,
      password: pmoPassword,
    } satisfies ITaskManagementPmo.ILogin,
  });

  // 3. Create a task status
  const taskStatusCode: string = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 8,
  });
  const taskStatusName: string = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 8,
  });
  const taskStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.pmo.taskManagementTaskStatuses.create(
      connection,
      {
        body: {
          code: taskStatusCode.toLowerCase().replace(/\s+/g, "_"),
          name: taskStatusName,
          description: "Task status created for testing",
        } satisfies ITaskManagementTaskStatus.ICreate,
      },
    );
  typia.assert(taskStatus);

  // 4. Create a project
  const projectCode: string = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 8,
  })
    .toLowerCase()
    .replace(/\s+/g, "_");
  const projectName: string = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 8,
  });
  const project: ITaskManagementProject =
    await api.functional.taskManagement.pmo.projects.create(connection, {
      body: {
        owner_id: pmoUser.id,
        code: projectCode,
        name: projectName,
        description: "Project created for testing",
      } satisfies ITaskManagementProject.ICreate,
    });
  typia.assert(project);

  // 5. Create a task
  const taskTitle: string = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 8,
  });
  const task: ITaskManagementTask =
    await api.functional.taskManagement.pmo.tasks.create(connection, {
      body: {
        status_id: taskStatus.id,
        priority_id: typia.random<string & tags.Format<"uuid">>(),
        creator_id: developer.id,
        project_id: project.id,
        title: taskTitle,
        description: "Task created for testing",
      } satisfies ITaskManagementTask.ICreate,
    });
  typia.assert(task);

  // Switch back to developer after PMO setup
  await api.functional.auth.developer.login(connection, {
    body: {
      email: devEmail,
      password: devPassword,
    } satisfies ITaskManagementDeveloper.ILogin,
  });

  // 6. Create initial task status change by developer
  const initialStatusChange: ITaskManagementTaskStatusChange =
    await api.functional.taskManagement.developer.tasks.statusChanges.create(
      connection,
      {
        taskId: task.id,
        body: {
          task_id: task.id,
          new_status_id: taskStatus.id,
          changed_at: new Date().toISOString(),
          comment: "Initial status change",
        } satisfies ITaskManagementTaskStatusChange.ICreate,
      },
    );
  typia.assert(initialStatusChange);

  // 7. Update the task status change with new status and comment
  const newTaskStatusCode: string = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 8,
  })
    .toLowerCase()
    .replace(/\s+/g, "_");
  const newTaskStatusName: string = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 8,
  });
  const newTaskStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.pmo.taskManagementTaskStatuses.create(
      connection,
      {
        body: {
          code: newTaskStatusCode,
          name: newTaskStatusName,
          description: "New task status for update testing",
        } satisfies ITaskManagementTaskStatus.ICreate,
      },
    );
  typia.assert(newTaskStatus);

  const updatedComment: string = "Updated status comment";
  const updatedStatusChange: ITaskManagementTaskStatusChange =
    await api.functional.taskManagement.developer.tasks.statusChanges.update(
      connection,
      {
        taskId: task.id,
        statusChangeId: initialStatusChange.id,
        body: {
          new_status_id: newTaskStatus.id,
          comment: updatedComment,
          changed_at: new Date().toISOString(),
        } satisfies ITaskManagementTaskStatusChange.IUpdate,
      },
    );
  typia.assert(updatedStatusChange);

  TestValidator.equals(
    "new_status_id should be updated",
    updatedStatusChange.new_status_id,
    newTaskStatus.id,
  );
  TestValidator.equals(
    "comment should be updated",
    updatedStatusChange.comment,
    updatedComment,
  );
  TestValidator.equals(
    "statusChange id should remain the same",
    updatedStatusChange.id,
    initialStatusChange.id,
  );

  // 8. Failure scenario: invalid statusChangeId
  await TestValidator.error(
    "update with invalid statusChangeId should fail",
    async () => {
      await api.functional.taskManagement.developer.tasks.statusChanges.update(
        connection,
        {
          taskId: task.id,
          statusChangeId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            new_status_id: newTaskStatus.id,
            comment: "Invalid statusChangeId test",
          } satisfies ITaskManagementTaskStatusChange.IUpdate,
        },
      );
    },
  );

  // 9. Failure scenario: unauthorized update (no auth)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized update (no token) should fail",
    async () => {
      await api.functional.taskManagement.developer.tasks.statusChanges.update(
        unauthConn,
        {
          taskId: task.id,
          statusChangeId: initialStatusChange.id,
          body: {
            new_status_id: newTaskStatus.id,
          } satisfies ITaskManagementTaskStatusChange.IUpdate,
        },
      );
    },
  );

  // 10. Failure scenario: update with non-existent new_status_id
  await TestValidator.error(
    "update with non-existent new_status_id should fail",
    async () => {
      await api.functional.taskManagement.developer.tasks.statusChanges.update(
        connection,
        {
          taskId: task.id,
          statusChangeId: initialStatusChange.id,
          body: {
            new_status_id: typia.random<string & tags.Format<"uuid">>(),
          } satisfies ITaskManagementTaskStatusChange.IUpdate,
        },
      );
    },
  );
}
