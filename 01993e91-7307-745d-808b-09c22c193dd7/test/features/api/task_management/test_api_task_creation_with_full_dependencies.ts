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
import type { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

export async function test_api_task_creation_with_full_dependencies(
  connection: api.IConnection,
) {
  // 1. TPM user registration (join) to create TPM account
  const tpmEmail: string = typia.random<string & tags.Format<"email">>();
  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: {
        email: tpmEmail,
        password: "P@ssw0rd123",
        name: RandomGenerator.name(),
      } satisfies ITaskManagementTpm.IJoin,
    });
  typia.assert(tpmUser);

  // 2. PMO user registration (join) to create PMO account
  const pmoEmail: string = typia.random<string & tags.Format<"email">>();
  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, {
      body: {
        email: pmoEmail,
        password: "P@ssw0rd123",
        name: RandomGenerator.name(),
      } satisfies ITaskManagementPmo.IJoin,
    });
  typia.assert(pmoUser);

  // 3. TPM user creates a Task Status
  const taskStatusCode = `ts_${RandomGenerator.alphaNumeric(6)}`;
  const taskStatusName = RandomGenerator.name(2);
  const taskStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      {
        body: {
          code: taskStatusCode,
          name: taskStatusName,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ITaskManagementTaskStatus.ICreate,
      },
    );
  typia.assert(taskStatus);
  TestValidator.predicate(
    "task status code and name are non-empty",
    taskStatus.code.length > 0 && taskStatus.name.length > 0,
  );

  // 4. Switch to PMO user (login) authentication for Priority creation
  await api.functional.auth.pmo.login(connection, {
    body: {
      email: pmoEmail,
      password: "P@ssw0rd123",
    } satisfies ITaskManagementPmo.ILogin,
  });

  // 5. PMO user creates a Task Priority
  const priorityCode = `pr_${RandomGenerator.alphaNumeric(5)}`;
  const priorityName = RandomGenerator.name(2);
  const taskPriority: ITaskManagementPriority =
    await api.functional.taskManagement.pmo.taskManagementPriorities.create(
      connection,
      {
        body: {
          code: priorityCode,
          name: priorityName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ITaskManagementPriority.ICreate,
      },
    );
  typia.assert(taskPriority);
  TestValidator.predicate(
    "task priority code and name are non-empty",
    taskPriority.code.length > 0 && taskPriority.name.length > 0,
  );

  // 6. Switch back to TPM user (login)
  await api.functional.auth.tpm.login(connection, {
    body: {
      email: tpmEmail,
      password: "P@ssw0rd123",
    } satisfies ITaskManagementTpm.ILogin,
  });

  // 7. TPM user creates a Project
  const projectCode = `pj_${RandomGenerator.alphaNumeric(6)}`;
  const projectName = RandomGenerator.name(3);
  const projectDescription = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 3,
    sentenceMax: 6,
  });
  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: {
        owner_id: tpmUser.id,
        code: projectCode,
        name: projectName,
        description: projectDescription,
      } satisfies ITaskManagementProject.ICreate,
    });
  typia.assert(project);
  TestValidator.equals(
    "project owner id matches",
    project.owner_id,
    tpmUser.id,
  );
  TestValidator.predicate(
    "project code and name non-empty",
    project.code.length > 0 && project.name.length > 0,
  );

  // 8. TPM user creates a Board inside the Project
  const boardCode = `bd_${RandomGenerator.alphaNumeric(5)}`;
  const boardName = RandomGenerator.name(2);
  const boardDescription = RandomGenerator.paragraph({ sentences: 2 });
  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: {
        project_id: project.id,
        owner_id: tpmUser.id,
        code: boardCode,
        name: boardName,
        description: boardDescription,
      } satisfies ITaskManagementBoard.ICreate,
    });
  typia.assert(board);
  TestValidator.equals(
    "board project id matches",
    board.project_id,
    project.id,
  );
  TestValidator.equals("board owner id matches", board.owner_id, tpmUser.id);
  TestValidator.predicate(
    "board code and name non-empty",
    board.code.length > 0 && board.name.length > 0,
  );

  // 9. TPM user creates a Task with references to created status, priority, project, and board
  const taskTitle = RandomGenerator.name(3);
  const taskDescription = RandomGenerator.content({ paragraphs: 1 });
  const taskDueDate = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // one week from now
  const taskCreateBody = {
    status_id: taskStatus.id,
    priority_id: taskPriority.id,
    creator_id: tpmUser.id,
    project_id: project.id,
    board_id: board.id,
    title: taskTitle,
    description: taskDescription,
    due_date: taskDueDate,
  } satisfies ITaskManagementTask.ICreate;

  const task: ITaskManagementTask =
    await api.functional.taskManagement.tpm.tasks.create(connection, {
      body: taskCreateBody,
    });
  typia.assert(task);
  TestValidator.equals("task creator id matches", task.creator_id, tpmUser.id);
  TestValidator.equals("task status id matches", task.status_id, taskStatus.id);
  TestValidator.equals(
    "task priority id matches",
    task.priority_id,
    taskPriority.id,
  );
  TestValidator.equals("task project id matches", task.project_id, project.id);
  TestValidator.equals("task board id matches", task.board_id, board.id);
  TestValidator.predicate(
    "task title is non-empty",
    typeof task.title === "string" && task.title.length > 0,
  );
}
