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
 * This E2E test validates the workflow of a Project Manager (PM) user who joins
 * the system, creates a project, a board, and a task, then creates and updates
 * a task status change successfully.
 *
 * The test ensures all operations succeed with the correct authorization and
 * inputs, also verifies error when an invalid update is attempted.
 *
 * Steps:
 *
 * 1. PM user joins and authenticates.
 * 2. PM user creates a project.
 * 3. PM user creates a board under the project.
 * 4. PM user creates a task linked to the project and board.
 * 5. PM user creates a task status change.
 * 6. PM user updates the task status change with new values.
 * 7. Validate task status change update is successful and data matches
 *    expectations.
 * 8. Attempt invalid task status change update and expect error.
 */
export async function test_api_task_status_changes_update_pm_authorized_success(
  connection: api.IConnection,
) {
  // 1. PM user joins
  const pmCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPass123!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPm.ICreate;
  const pmUser: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, {
      body: pmCreateBody,
    });
  typia.assert(pmUser);

  // 2. PM user creates a project
  const projectCreateBody = {
    owner_id: pmUser.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ITaskManagementProject.ICreate;
  const project: ITaskManagementProject =
    await api.functional.taskManagement.pm.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(project);
  TestValidator.equals("project owner matches", project.owner_id, pmUser.id);

  // 3. PM user creates a board under the project
  const boardCreateBody = {
    project_id: project.id,
    owner_id: pmUser.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ITaskManagementBoard.ICreate;
  const board: ITaskManagementBoard =
    await api.functional.taskManagement.pm.projects.boards.create(connection, {
      projectId: project.id,
      body: boardCreateBody,
    });
  typia.assert(board);
  TestValidator.equals(
    "board project id matches",
    board.project_id,
    project.id,
  );

  // 4. PM user creates a task linked to the project and board
  const taskStatusId = typia.random<string & tags.Format<"uuid">>();
  const taskPriorityId = typia.random<string & tags.Format<"uuid">>();
  const taskCreateBody = {
    status_id: taskStatusId,
    priority_id: taskPriorityId,
    creator_id: pmUser.id,
    project_id: project.id,
    board_id: board.id,
    title: RandomGenerator.name(3),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status_name: null,
    priority_name: null,
    due_date: null,
  } satisfies ITaskManagementTask.ICreate;
  const task: ITaskManagementTask =
    await api.functional.taskManagement.pm.tasks.create(connection, {
      body: taskCreateBody,
    });
  typia.assert(task);
  TestValidator.equals("task project id matches", task.project_id, project.id);
  TestValidator.equals("task board id matches", task.board_id, board.id);
  TestValidator.equals("task creator matches", task.creator_id, pmUser.id);

  // 5. PM user creates a task status change
  const initialChangedAt = new Date().toISOString();
  const statusChangeCreateBody = {
    task_id: task.id,
    new_status_id: task.status_id,
    changed_at: initialChangedAt,
    comment: "Initial status set",
  } satisfies ITaskManagementTaskStatusChange.ICreate;
  const statusChange: ITaskManagementTaskStatusChange =
    await api.functional.taskManagement.pm.tasks.statusChanges.create(
      connection,
      {
        taskId: task.id,
        body: statusChangeCreateBody,
      },
    );
  typia.assert(statusChange);
  TestValidator.equals(
    "status change task id matches",
    statusChange.task_id,
    task.id,
  );
  TestValidator.equals(
    "status change new status id matches",
    statusChange.new_status_id,
    task.status_id,
  );

  // 6. PM user updates the task status change with new values
  const updatedChangedAt = new Date(Date.now() + 1000 * 60 * 5).toISOString(); // 5 mins later
  const updatedNewStatusId = typia.random<string & tags.Format<"uuid">>();
  const updatedComment = "Updated status and comment";
  const statusChangeUpdateBody = {
    new_status_id: updatedNewStatusId,
    changed_at: updatedChangedAt,
    comment: updatedComment,
  } satisfies ITaskManagementTaskStatusChange.IUpdate;
  const updatedStatusChange: ITaskManagementTaskStatusChange =
    await api.functional.taskManagement.pm.tasks.statusChanges.update(
      connection,
      {
        taskId: task.id,
        statusChangeId: statusChange.id,
        body: statusChangeUpdateBody,
      },
    );
  typia.assert(updatedStatusChange);
  TestValidator.equals(
    "updated status change id matches",
    updatedStatusChange.id,
    statusChange.id,
  );
  TestValidator.equals(
    "updated new status id matches",
    updatedStatusChange.new_status_id,
    updatedNewStatusId,
  );
  TestValidator.equals(
    "updated changed_at matches",
    updatedStatusChange.changed_at,
    updatedChangedAt,
  );
  TestValidator.equals(
    "updated comment matches",
    updatedStatusChange.comment,
    updatedComment,
  );

  // 7. Attempt invalid update and expect error
  await TestValidator.error(
    "task status change update with invalid new_status_id should fail",
    async () => {
      await api.functional.taskManagement.pm.tasks.statusChanges.update(
        connection,
        {
          taskId: task.id,
          statusChangeId: statusChange.id,
          body: {
            new_status_id: "00000000-0000-0000-0000-000000000000", // nonexistent UUID
          } satisfies ITaskManagementTaskStatusChange.IUpdate,
        },
      );
    },
  );
}
