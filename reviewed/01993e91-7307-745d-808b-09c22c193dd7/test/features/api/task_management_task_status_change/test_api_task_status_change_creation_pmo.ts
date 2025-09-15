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
import type { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This test verifies the full workflow of creating a task status change by a
 * PMO user.
 *
 * The workflow includes registering and logging in PMO and TPM users, creating
 * TPM user entities, a project, a board, task statuses (initial and new), a
 * priority, and a task. The test then switches authentication to the PMO user
 * and creates a status change entry, verifying the accuracy of its persisted
 * state.
 */
export async function test_api_task_status_change_creation_pmo(
  connection: api.IConnection,
) {
  // 1. PMO user registration
  const pmoEmail = typia.random<string & tags.Format<"email">>();
  const pmoPassword = RandomGenerator.alphaNumeric(12);
  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, {
      body: {
        email: pmoEmail,
        password: pmoPassword,
        name: RandomGenerator.name(),
      } satisfies ITaskManagementPmo.IJoin,
    });
  typia.assert(pmoUser);

  // 2. TPM user registration
  const tpmEmail = typia.random<string & tags.Format<"email">>();
  const tpmPassword = RandomGenerator.alphaNumeric(12);
  const tpmUserAuth: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: {
        email: tpmEmail,
        password: tpmPassword,
        name: RandomGenerator.name(),
      } satisfies ITaskManagementTpm.IJoin,
    });
  typia.assert(tpmUserAuth);

  // 3. TPM user entity creation
  const tpmUser: ITaskManagementTpm =
    await api.functional.taskManagement.tpm.taskManagement.tpms.create(
      connection,
      {
        body: {
          email: tpmEmail,
          name: tpmUserAuth.name,
          password_hash: RandomGenerator.alphaNumeric(32),
        } satisfies ITaskManagementTpm.ICreate,
      },
    );
  typia.assert(tpmUser);

  // 4. Project creation owned by TPM user
  const projectCode = RandomGenerator.alphaNumeric(8);
  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: {
        owner_id: tpmUser.id,
        code: projectCode,
        name: RandomGenerator.name(),
        description: "Generated Project",
      } satisfies ITaskManagementProject.ICreate,
    });
  typia.assert(project);

  // 5. Board creation under the project
  const boardCode = RandomGenerator.alphaNumeric(8);
  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: {
        project_id: project.id,
        owner_id: tpmUser.id,
        code: boardCode,
        name: RandomGenerator.name(),
        description: "Generated Board",
      } satisfies ITaskManagementBoard.ICreate,
    });
  typia.assert(board);

  // 6. Create initial task status
  const initialStatusCode = "init_status_" + RandomGenerator.alphaNumeric(4);
  const initialStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      {
        body: {
          code: initialStatusCode,
          name: "Initial Status",
          description: "Initial task status created for test",
        } satisfies ITaskManagementTaskStatus.ICreate,
      },
    );
  typia.assert(initialStatus);

  // 7. Create new task status for status change
  const newStatusCode = "new_status_" + RandomGenerator.alphaNumeric(4);
  const newStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      {
        body: {
          code: newStatusCode,
          name: "New Status",
          description: "New status for task change",
        } satisfies ITaskManagementTaskStatus.ICreate,
      },
    );
  typia.assert(newStatus);

  // 8. Create a priority
  const priorityCode = "priority_" + RandomGenerator.alphaNumeric(4);
  const priority: ITaskManagementPriority =
    await api.functional.taskManagement.tpm.taskManagementPriorities.create(
      connection,
      {
        body: {
          code: priorityCode,
          name: "High Priority",
          description: "Priority for the task",
        } satisfies ITaskManagementPriority.ICreate,
      },
    );
  typia.assert(priority);

  // 9. Create a task
  const taskTitle = RandomGenerator.paragraph({ sentences: 3 });
  const taskDescription = RandomGenerator.content({ paragraphs: 1 });
  const task: ITaskManagementTask =
    await api.functional.taskManagement.tpm.tasks.create(connection, {
      body: {
        status_id: initialStatus.id,
        priority_id: priority.id,
        creator_id: tpmUser.id,
        project_id: project.id,
        board_id: board.id,
        title: taskTitle,
        description: taskDescription,
        status_name: initialStatus.name,
        priority_name: priority.name,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      } satisfies ITaskManagementTask.ICreate,
    });
  typia.assert(task);

  // 10. Switch authentication to PMO user
  await api.functional.auth.pmo.login(connection, {
    body: {
      email: pmoEmail,
      password: pmoPassword,
    } satisfies ITaskManagementPmo.ILogin,
  });

  // 11. Create the status change for the task
  const comment = "Status changed by PMO user";
  const changedAt = new Date().toISOString();
  const statusChange: ITaskManagementTaskStatusChange =
    await api.functional.taskManagement.pmo.tasks.statusChanges.create(
      connection,
      {
        taskId: task.id,
        body: {
          task_id: task.id,
          new_status_id: newStatus.id,
          changed_at: changedAt,
          comment: comment,
        } satisfies ITaskManagementTaskStatusChange.ICreate,
      },
    );
  typia.assert(statusChange);

  // 12. Validations on the created status change
  TestValidator.equals(
    "statusChange taskId equals task.id",
    statusChange.task_id,
    task.id,
  );
  TestValidator.equals(
    "statusChange new_status_id equals newStatus.id",
    statusChange.new_status_id,
    newStatus.id,
  );
  TestValidator.equals(
    "statusChange comment recorded",
    statusChange.comment,
    comment,
  );
  TestValidator.predicate(
    "statusChange changed_at is ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(.\d+)?Z$/.test(
      statusChange.changed_at,
    ),
  );
}
