import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";

/**
 * This test function validates the entire process of a Project Manager (PM)
 * user creating a project management task status change with correct
 * authorization and business logic. It starts by registering a PM user and
 * authenticating the session. Then, the PM user creates a new project,
 * followed by creating a board in that project. Next, the PM user creates a
 * task with valid required fields referencing the project and board, with
 * proper status and priority IDs. Afterward, the PM user creates a task
 * status change associated with the task, specifying the new status ID and
 * the timestamp of the change. Each critical step is verified by asserting
 * the returned data types and required properties. The status change
 * response is validated to ensure the new status ID matches the request and
 * the association to the task is correct, thus confirming the correct
 * business logic and authorization enforcement.
 */
export async function test_api_task_status_changes_create_pm_authorized_success(
  connection: api.IConnection,
) {
  // 1. PM user joins and authenticates
  const pmUserEmail = typia.random<string & tags.Format<"email">>();
  const pmUser: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, {
      body: {
        email: pmUserEmail,
        password: "SecurePass123!",
        name: RandomGenerator.name(),
      } satisfies ITaskManagementPm.ICreate,
    });
  typia.assert(pmUser);

  // 2. PM user creates a project
  const projectCode = RandomGenerator.alphaNumeric(6);
  const projectName = RandomGenerator.paragraph({ sentences: 3 });
  const projectDescription = RandomGenerator.content({ paragraphs: 1 });
  const project: ITaskManagementProject =
    await api.functional.taskManagement.pm.projects.create(connection, {
      body: {
        owner_id: pmUser.id,
        code: projectCode,
        name: projectName,
        description: projectDescription,
      } satisfies ITaskManagementProject.ICreate,
    });
  typia.assert(project);

  // 3. PM user creates a board in the project
  const boardCode = RandomGenerator.alphaNumeric(4);
  const boardName = RandomGenerator.paragraph({ sentences: 2 });
  const boardDescription = RandomGenerator.paragraph({ sentences: 3 });
  const board: ITaskManagementBoard =
    await api.functional.taskManagement.pm.projects.boards.create(connection, {
      projectId: project.id,
      body: {
        project_id: project.id,
        owner_id: pmUser.id,
        code: boardCode,
        name: boardName,
        description: boardDescription,
      } satisfies ITaskManagementBoard.ICreate,
    });
  typia.assert(board);

  // 4. PM user creates a task within the project and board
  // We need status_id and priority_id - generate valid UUIDs
  const statusId = typia.random<string & tags.Format<"uuid">>();
  const priorityId = typia.random<string & tags.Format<"uuid">>();
  const taskTitle = RandomGenerator.paragraph({ sentences: 3 });
  const taskDescription = RandomGenerator.content({ paragraphs: 1 });
  const task: ITaskManagementTask =
    await api.functional.taskManagement.pm.tasks.create(connection, {
      body: {
        status_id: statusId,
        priority_id: priorityId,
        creator_id: pmUser.id,
        project_id: project.id,
        board_id: board.id,
        title: taskTitle,
        description: taskDescription,
      } satisfies ITaskManagementTask.ICreate,
    });
  typia.assert(task);

  // 5. PM user creates a task status change for the created task
  // Set new_status_id different from current status_id to simulate change
  const newStatusId = typia.random<string & tags.Format<"uuid">>();
  const changedAt = new Date().toISOString();
  const comment = RandomGenerator.paragraph({ sentences: 2 });
  const statusChange: ITaskManagementTaskStatusChange =
    await api.functional.taskManagement.pm.tasks.statusChanges.create(
      connection,
      {
        taskId: task.id,
        body: {
          task_id: task.id,
          new_status_id: newStatusId,
          changed_at: changedAt,
          comment: comment,
        } satisfies ITaskManagementTaskStatusChange.ICreate,
      },
    );
  typia.assert(statusChange);

  // 6. Assertions to confirm business logic
  TestValidator.equals(
    "task id matches in status change",
    statusChange.task_id,
    task.id,
  );
  TestValidator.equals(
    "new status id matches requested",
    statusChange.new_status_id,
    newStatusId,
  );
  TestValidator.predicate(
    "changed_at is a valid ISO datetime",
    typeof statusChange.changed_at === "string" &&
      !Number.isNaN(Date.parse(statusChange.changed_at)),
  );
}
