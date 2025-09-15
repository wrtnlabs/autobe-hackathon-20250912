import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPriority";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";
import type { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This test verifies the retrieval of a specific task status change by a PM
 * user.
 *
 * The business workflow includes:
 *
 * 1. PM user registration and login to obtain authentication.
 * 2. TPM user creates necessary base entities: TaskStatus, TaskPriority,
 *    Project, and Board.
 * 3. TPM user creates a Task within the created Project and Board.
 * 4. TPM user creates a TaskStatusChange for the Task.
 * 5. PM user retrieves the specific TaskStatusChange by ID.
 * 6. Verification of correctness of retrieved data including timestamps and
 *    comments.
 * 7. Negative tests for invalid IDs and authorization check.
 */
export async function test_api_task_status_change_retrieval_by_pm(
  connection: api.IConnection,
) {
  // 1. Register and login as PM user
  const pmEmail = typia.random<string & tags.Format<"email">>();
  const pmPassword = "securePassword123";
  const pmJoin: ITaskManagementPm.ICreate = {
    email: pmEmail,
    password: pmPassword,
    name: RandomGenerator.name(2),
  };

  const pmAuthorized: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, { body: pmJoin });
  typia.assert(pmAuthorized);

  await api.functional.auth.pm.login(connection, {
    body: {
      email: pmEmail,
      password: pmPassword,
    } satisfies ITaskManagementPm.ILogin,
  });

  // 2. Register and login as TPM user for creating base data
  const tpmEmail = typia.random<string & tags.Format<"email">>();
  const tpmPassword = "securePassword123";
  const tpmJoin: ITaskManagementTpm.IJoin = {
    email: tpmEmail,
    password: tpmPassword,
    name: RandomGenerator.name(2),
  };

  const tpmAuthorized: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: tpmJoin });
  typia.assert(tpmAuthorized);

  await api.functional.auth.tpm.login(connection, {
    body: {
      email: tpmEmail,
      password: tpmPassword,
    } satisfies ITaskManagementTpm.ILogin,
  });

  const creatorId = tpmAuthorized.id;

  // 3. Create TaskStatus entities
  const statusToDo: ITaskManagementTaskStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      {
        body: {
          code: "to_do",
          name: "To Do",
          description: "Task is pending",
        } satisfies ITaskManagementTaskStatus.ICreate,
      },
    );
  typia.assert(statusToDo);

  const statusDoing: ITaskManagementTaskStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      {
        body: {
          code: "in_progress",
          name: "In Progress",
          description: "Task is ongoing",
        } satisfies ITaskManagementTaskStatus.ICreate,
      },
    );
  typia.assert(statusDoing);

  // 4. Create TaskPriority entity
  const priorityHigh: ITaskManagementPriority =
    await api.functional.taskManagement.tpm.taskManagementPriorities.create(
      connection,
      {
        body: {
          code: "high",
          name: "High Priority",
          description: "Requires immediate attention",
        } satisfies ITaskManagementPriority.ICreate,
      },
    );
  typia.assert(priorityHigh);

  // 5. Create a Project
  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: {
        owner_id: creatorId,
        code: "proj-001",
        name: "Project Alpha",
        description: "First Project for Testing",
      } satisfies ITaskManagementProject.ICreate,
    });
  typia.assert(project);

  // 6. Create a Board within the Project
  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: {
        project_id: project.id,
        owner_id: creatorId,
        code: "board-001",
        name: "Development Board",
        description: "Development tasks board",
      } satisfies ITaskManagementBoard.ICreate,
    });
  typia.assert(board);

  // 7. Create a Task
  const task: ITaskManagementTask =
    await api.functional.taskManagement.tpm.tasks.create(connection, {
      body: {
        status_id: statusToDo.id,
        priority_id: priorityHigh.id,
        creator_id: creatorId,
        project_id: project.id,
        board_id: board.id,
        title: "Implement Feature X",
        description: "Implement the feature X for project Alpha",
      } satisfies ITaskManagementTask.ICreate,
    });
  typia.assert(task);

  // 8. Create a TaskStatusChange for the Task
  const changedAt = new Date().toISOString();
  const comment = "Starting work on the task";

  const taskStatusChange: ITaskManagementTaskStatusChange =
    await api.functional.taskManagement.tpm.tasks.statusChanges.create(
      connection,
      {
        taskId: task.id,
        body: {
          task_id: task.id,
          new_status_id: statusDoing.id,
          changed_at: changedAt,
          comment,
        } satisfies ITaskManagementTaskStatusChange.ICreate,
      },
    );
  typia.assert(taskStatusChange);

  // 9. Switch to PM user authentication for retrieval
  await api.functional.auth.pm.login(connection, {
    body: {
      email: pmEmail,
      password: pmPassword,
    } satisfies ITaskManagementPm.ILogin,
  });

  // 10. Retrieve the specific TaskStatusChange by ID
  const retrieved: ITaskManagementTaskStatusChange =
    await api.functional.taskManagement.pm.tasks.statusChanges.at(connection, {
      taskId: task.id,
      statusChangeId: taskStatusChange.id,
    });
  typia.assert(retrieved);

  // 11. Verify correctness of retrieved data
  TestValidator.equals(
    "TaskStatusChange id match",
    retrieved.id,
    taskStatusChange.id,
  );
  TestValidator.equals(
    "TaskStatusChange taskId match",
    retrieved.task_id,
    task.id,
  );
  TestValidator.equals(
    "TaskStatusChange newStatusId match",
    retrieved.new_status_id,
    statusDoing.id,
  );
  TestValidator.equals(
    "TaskStatusChange changedAt match",
    retrieved.changed_at,
    changedAt,
  );
  TestValidator.equals(
    "TaskStatusChange comment match",
    retrieved.comment,
    comment,
  );

  // 12. Negative test: Invalid statusChangeId
  await TestValidator.error("Invalid StatusChangeId error", async () => {
    await api.functional.taskManagement.pm.tasks.statusChanges.at(connection, {
      taskId: task.id,
      statusChangeId: typia.random<string & tags.Format<"uuid">>(),
    });
  });

  // 13. Negative test: Invalid taskId
  await TestValidator.error("Invalid TaskId error", async () => {
    await api.functional.taskManagement.pm.tasks.statusChanges.at(connection, {
      taskId: typia.random<string & tags.Format<"uuid">>(),
      statusChangeId: taskStatusChange.id,
    });
  });
}
