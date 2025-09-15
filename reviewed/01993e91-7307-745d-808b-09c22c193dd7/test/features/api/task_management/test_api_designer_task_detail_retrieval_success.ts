import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDesigner";
import type { ITaskManagementPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPriority";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";

/**
 * This test validates the detailed task retrieval functionality for a
 * Designer user. It fully covers the business workflow from user
 * registration, project setup, status and priority creation, task creation,
 * and finally retrieving the detailed task information by its ID.
 *
 * The scenario includes both successful retrieval and validation of
 * returned data, as well as error cases for unauthorized access and
 * non-existent task IDs.
 *
 * Steps:
 *
 * 1. Register and authenticate a Designer user.
 * 2. Create a Project under that Designer.
 * 3. Create a Task Status to assign to the Task.
 * 4. Create a Task Priority to assign to the Task.
 * 5. Create a Task in the Project, assigned with Status, Priority, and the
 *    Designer as creator.
 * 6. Retrieve the Task details as the Designer.
 * 7. Assert the correctness of the retrieved Task's details, including IDs,
 *    title, description, status, and priority.
 * 8. Try to retrieve a task with a non-existent taskId and assert failure.
 * 9. Create another Designer to verify unauthorized access is denied to tasks
 *    belonging to others.
 */
export async function test_api_designer_task_detail_retrieval_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a Designer user
  const designerEmail: string = typia.random<string & tags.Format<"email">>();
  const designer: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.join(connection, {
      body: {
        email: designerEmail,
        password_hash: RandomGenerator.alphaNumeric(32),
        name: RandomGenerator.name(),
      } satisfies ITaskManagementDesigner.ICreate,
    });
  typia.assert(designer);

  // 2. Create a Project under the Designer
  const projectCode: string = RandomGenerator.alphaNumeric(10);
  const projectName: string = RandomGenerator.name(2);
  const projectDescription: string = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 8,
  });
  const project: ITaskManagementProject =
    await api.functional.taskManagement.pmo.projects.create(connection, {
      body: {
        owner_id: designer.id,
        code: projectCode,
        name: projectName,
        description: projectDescription,
      } satisfies ITaskManagementProject.ICreate,
    });
  typia.assert(project);
  TestValidator.equals(
    "project owner id matches designer id",
    project.owner_id,
    designer.id,
  );

  // 3. Create a Task Status
  const statusCode: string = RandomGenerator.alphaNumeric(8);
  const statusName: string = RandomGenerator.name(2);
  const statusDescription: string = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 8,
  });
  const status: ITaskManagementTaskStatus =
    await api.functional.taskManagement.pmo.taskManagementTaskStatuses.create(
      connection,
      {
        body: {
          code: statusCode,
          name: statusName,
          description: statusDescription,
        } satisfies ITaskManagementTaskStatus.ICreate,
      },
    );
  typia.assert(status);
  TestValidator.equals("task status code matches", status.code, statusCode);

  // 4. Create a Task Priority
  const priorityCode: string = RandomGenerator.alphaNumeric(8);
  const priorityName: string = RandomGenerator.name(2);
  const priorityDescription: string = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 8,
  });
  const priority: ITaskManagementPriority =
    await api.functional.taskManagement.pmo.taskManagementPriorities.create(
      connection,
      {
        body: {
          code: priorityCode,
          name: priorityName,
          description: priorityDescription,
        } satisfies ITaskManagementPriority.ICreate,
      },
    );
  typia.assert(priority);
  TestValidator.equals(
    "task priority code matches",
    priority.code,
    priorityCode,
  );

  // 5. Create a Task
  const taskTitle: string = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const taskDescription: string = RandomGenerator.content({ paragraphs: 2 });
  const taskDueDate: string = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 7,
  ).toISOString(); // 7 days from now
  const taskCreateBody = {
    status_id: status.id,
    priority_id: priority.id,
    creator_id: designer.id,
    project_id: project.id,
    title: taskTitle,
    description: taskDescription,
    due_date: taskDueDate,
  } satisfies ITaskManagementTask.ICreate;
  const task: ITaskManagementTask =
    await api.functional.taskManagement.pmo.tasks.create(connection, {
      body: taskCreateBody,
    });
  typia.assert(task);
  TestValidator.equals("task title matches", task.title, taskTitle);
  TestValidator.equals(
    "task description matches",
    task.description ?? null,
    taskDescription,
  );
  TestValidator.equals("task status id matches", task.status_id, status.id);
  TestValidator.equals(
    "task priority id matches",
    task.priority_id,
    priority.id,
  );
  TestValidator.equals("task creator id matches", task.creator_id, designer.id);
  TestValidator.equals("task project id matches", task.project_id, project.id);
  TestValidator.equals(
    "task due date matches",
    task.due_date ?? null,
    taskDueDate,
  );

  // 6. Retrieve the Task details
  const retrievedTask: ITaskManagementTask =
    await api.functional.taskManagement.designer.tasks.at(connection, {
      taskId: task.id,
    });
  typia.assert(retrievedTask);

  // 7. Assert retrieved task details
  TestValidator.equals(
    "retrieved task id matches created task id",
    retrievedTask.id,
    task.id,
  );
  TestValidator.equals(
    "retrieved task title matches",
    retrievedTask.title,
    taskTitle,
  );
  TestValidator.equals(
    "retrieved task description matches",
    retrievedTask.description ?? null,
    taskDescription,
  );
  TestValidator.equals(
    "retrieved task status id matches",
    retrievedTask.status_id,
    status.id,
  );
  TestValidator.equals(
    "retrieved task priority id matches",
    retrievedTask.priority_id,
    priority.id,
  );
  TestValidator.equals(
    "retrieved task creator id matches",
    retrievedTask.creator_id,
    designer.id,
  );
  TestValidator.equals(
    "retrieved task project id matches",
    retrievedTask.project_id ?? null,
    project.id,
  );
  TestValidator.equals(
    "retrieved task due date matches",
    retrievedTask.due_date ?? null,
    taskDueDate,
  );

  // 8. Attempt to retrieve a non-existent task ID
  await TestValidator.error(
    "retrieving non-existent task should fail",
    async () => {
      await api.functional.taskManagement.designer.tasks.at(connection, {
        taskId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // 9. Create another Designer user for unauthorized access test
  const otherDesignerEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const otherDesigner: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.join(connection, {
      body: {
        email: otherDesignerEmail,
        password_hash: RandomGenerator.alphaNumeric(32),
        name: RandomGenerator.name(),
      } satisfies ITaskManagementDesigner.ICreate,
    });
  typia.assert(otherDesigner);

  // Create new connection for other designer (simulate unauthorized user)
  const unauthorizedConnection: api.IConnection = {
    host: connection.host,
    headers: {},
    simulate: connection.simulate ?? false,
  };

  // Authenticate the other designer to set token in unauthorizedConnection
  await api.functional.auth.designer.join(unauthorizedConnection, {
    body: {
      email: otherDesignerEmail,
      password_hash: otherDesigner.password_hash,
      name: otherDesigner.name,
    } satisfies ITaskManagementDesigner.ICreate,
  });

  // Attempt to retrieve the first designer's task with unauthorized user
  await TestValidator.error(
    "unauthorized user cannot retrieve other's task",
    async () => {
      await api.functional.taskManagement.designer.tasks.at(
        unauthorizedConnection,
        {
          taskId: task.id,
        },
      );
    },
  );
}
