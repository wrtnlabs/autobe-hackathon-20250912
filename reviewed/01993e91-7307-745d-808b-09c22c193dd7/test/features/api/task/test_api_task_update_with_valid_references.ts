import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPriority";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";

/**
 * This E2E test validates the full workflow of updating a task by an authorized
 * PM user.
 *
 * It creates all necessary dependencies like task status, priority, project,
 * board, and an initial task. Then, it performs a complete update with
 * monitoring.
 *
 * All role authentications for PM and PMO are properly handled including role
 * switches.
 *
 * Validations ensure all updated fields are saved and returned correctly.
 *
 * All timestamps and foreign references are verified.
 */
export async function test_api_task_update_with_valid_references(
  connection: api.IConnection,
) {
  // 1. PM user joins the system
  const pmEmail = typia.random<string & tags.Format<"email">>();
  const pmName = RandomGenerator.name();
  const pmPassword = "ValidPass123!";

  const pmJoined: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, {
      body: {
        email: pmEmail,
        password: pmPassword,
        name: pmName,
      } satisfies ITaskManagementPm.ICreate,
    });
  typia.assert(pmJoined);

  // 2. PM user logs in
  const pmLoggedIn: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.login(connection, {
      body: {
        email: pmEmail,
        password: pmPassword,
      } satisfies ITaskManagementPm.ILogin,
    });
  typia.assert(pmLoggedIn);

  // 3. Create a task status (using PM authorization context)
  const statusCode = RandomGenerator.alphaNumeric(6);
  const statusName = RandomGenerator.name();
  const taskStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.pm.taskManagementTaskStatuses.create(
      connection,
      {
        body: {
          code: statusCode,
          name: statusName,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ITaskManagementTaskStatus.ICreate,
      },
    );
  typia.assert(taskStatus);

  // 4. Join a PMO user
  const pmoEmail = typia.random<string & tags.Format<"email">>();
  const pmoName = RandomGenerator.name();
  const pmoPassword = "SecurePwd321!";

  const pmoJoined: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, {
      body: {
        email: pmoEmail,
        password: pmoPassword,
        name: pmoName,
      } satisfies ITaskManagementPmo.IJoin,
    });
  typia.assert(pmoJoined);

  // 5. PMO user logs in
  const pmoLoggedIn: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.login(connection, {
      body: {
        email: pmoEmail,
        password: pmoPassword,
      } satisfies ITaskManagementPmo.ILogin,
    });
  typia.assert(pmoLoggedIn);

  // 6. Create a priority (using PMO authorization context)
  const priorityCode = RandomGenerator.alphaNumeric(6);
  const priorityName = RandomGenerator.name();
  const taskPriority: ITaskManagementPriority =
    await api.functional.taskManagement.pmo.taskManagementPriorities.create(
      connection,
      {
        body: {
          code: priorityCode,
          name: priorityName,
          description: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies ITaskManagementPriority.ICreate,
      },
    );
  typia.assert(taskPriority);

  // 7. Back to PM login for subsequent operations
  await api.functional.auth.pm.login(connection, {
    body: {
      email: pmEmail,
      password: pmPassword,
    } satisfies ITaskManagementPm.ILogin,
  });

  // 8. Create a project owned by PM user
  const projectCode = RandomGenerator.alphaNumeric(6);
  const projectName = RandomGenerator.name();
  const project: ITaskManagementProject =
    await api.functional.taskManagement.pm.projects.create(connection, {
      body: {
        owner_id: pmJoined.id,
        code: projectCode,
        name: projectName,
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ITaskManagementProject.ICreate,
    });
  typia.assert(project);

  // 9. Create a board following the project and owned by PM user
  const boardCode = RandomGenerator.alphaNumeric(6);
  const boardName = RandomGenerator.name();
  const board: ITaskManagementBoard =
    await api.functional.taskManagement.pm.projects.boards.create(connection, {
      projectId: project.id,
      body: {
        project_id: project.id,
        owner_id: pmJoined.id,
        code: boardCode,
        name: boardName,
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ITaskManagementBoard.ICreate,
    });
  typia.assert(board);

  // 10. Create an initial task with valid references
  const taskTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const taskDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 6,
    sentenceMax: 9,
    wordMin: 4,
    wordMax: 8,
  });
  const dueDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();

  const initialTask: ITaskManagementTask =
    await api.functional.taskManagement.pm.tasks.create(connection, {
      body: {
        status_id: taskStatus.id,
        priority_id: taskPriority.id,
        creator_id: pmJoined.id,
        project_id: project.id,
        board_id: board.id,
        title: taskTitle,
        description: taskDescription,
        due_date: dueDate,
        status_name: taskStatus.name ?? null,
        priority_name: taskPriority.name ?? null,
      } satisfies ITaskManagementTask.ICreate,
    });
  typia.assert(initialTask);

  // 11. Prepare an update payload to change main fields
  const updatedTitle = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 3,
    wordMax: 8,
  });
  const updatedDescription = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 6,
    sentenceMax: 10,
    wordMin: 4,
    wordMax: 9,
  });
  const updatedDueDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 14,
  ).toISOString();

  // Create a second task status for update to ensure changed status
  const newStatusCode = RandomGenerator.alphaNumeric(6);
  const newStatusName = RandomGenerator.name();
  const newTaskStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.pm.taskManagementTaskStatuses.create(
      connection,
      {
        body: {
          code: newStatusCode,
          name: newStatusName,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ITaskManagementTaskStatus.ICreate,
      },
    );
  typia.assert(newTaskStatus);

  // Create a second task priority for update
  const newPriorityCode = RandomGenerator.alphaNumeric(6);
  const newPriorityName = RandomGenerator.name();
  await api.functional.auth.pmo.login(connection, {
    body: {
      email: pmoEmail,
      password: pmoPassword,
    } satisfies ITaskManagementPmo.ILogin,
  });
  const newTaskPriority: ITaskManagementPriority =
    await api.functional.taskManagement.pmo.taskManagementPriorities.create(
      connection,
      {
        body: {
          code: newPriorityCode,
          name: newPriorityName,
          description: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies ITaskManagementPriority.ICreate,
      },
    );
  typia.assert(newTaskPriority);

  await api.functional.auth.pm.login(connection, {
    body: {
      email: pmEmail,
      password: pmPassword,
    } satisfies ITaskManagementPm.ILogin,
  });

  // Create a second project for update
  const newProjectCode = RandomGenerator.alphaNumeric(6);
  const newProjectName = RandomGenerator.name();
  const newProject: ITaskManagementProject =
    await api.functional.taskManagement.pm.projects.create(connection, {
      body: {
        owner_id: pmJoined.id,
        code: newProjectCode,
        name: newProjectName,
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ITaskManagementProject.ICreate,
    });
  typia.assert(newProject);

  // Create a second board for update
  const newBoardCode = RandomGenerator.alphaNumeric(6);
  const newBoardName = RandomGenerator.name();
  const newBoard: ITaskManagementBoard =
    await api.functional.taskManagement.pm.projects.boards.create(connection, {
      projectId: newProject.id,
      body: {
        project_id: newProject.id,
        owner_id: pmJoined.id,
        code: newBoardCode,
        name: newBoardName,
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ITaskManagementBoard.ICreate,
    });
  typia.assert(newBoard);

  // 12. Call the update task endpoint with new values
  const updatePayload: ITaskManagementTask.IUpdate = {
    title: updatedTitle,
    description: updatedDescription,
    status_id: newTaskStatus.id,
    priority_id: newTaskPriority.id,
    project_id: newProject.id,
    board_id: newBoard.id,
    due_date: updatedDueDate,
  };

  const updatedTask: ITaskManagementTask =
    await api.functional.taskManagement.pm.tasks.updateTask(connection, {
      taskId: initialTask.id,
      body: updatePayload,
    });
  typia.assert(updatedTask);

  // 13. Validate the updated values
  TestValidator.equals(
    "Task ID remains unchanged",
    updatedTask.id,
    initialTask.id,
  );
  TestValidator.equals(
    "Task title updated",
    updatedTask.title,
    updatePayload.title ?? updatedTask.title,
  );
  TestValidator.equals(
    "Task description updated",
    updatedTask.description,
    updatePayload.description ?? updatedTask.description,
  );
  TestValidator.equals(
    "Task status_id updated",
    updatedTask.status_id,
    updatePayload.status_id ?? updatedTask.status_id,
  );
  TestValidator.equals(
    "Task priority_id updated",
    updatedTask.priority_id,
    updatePayload.priority_id ?? updatedTask.priority_id,
  );
  TestValidator.equals(
    "Task project_id updated",
    updatedTask.project_id,
    updatePayload.project_id ?? updatedTask.project_id,
  );
  TestValidator.equals(
    "Task board_id updated",
    updatedTask.board_id,
    updatePayload.board_id ?? updatedTask.board_id,
  );
  TestValidator.equals(
    "Task due_date updated",
    updatedTask.due_date,
    updatePayload.due_date ?? updatedTask.due_date,
  );

  TestValidator.predicate(
    "updated_at timestamp is updated",
    new Date(updatedTask.updated_at).getTime() >=
      new Date(updatedTask.created_at).getTime(),
  );
}
