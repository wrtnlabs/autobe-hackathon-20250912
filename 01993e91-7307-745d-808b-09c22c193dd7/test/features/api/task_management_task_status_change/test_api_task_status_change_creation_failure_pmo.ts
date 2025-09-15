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
 * This negative test scenario covers attempts by a PMO user to create task
 * status changes with invalid inputs or unauthorized actions. After
 * registering and authenticating a PMO user, dependencies including TPM
 * user, project, board, task and statuses are created. The PMO then
 * attempts to create status changes with invalid taskId, invalid statusId
 * or without authentication. The scenario verifies server error responses,
 * rejection of unauthorized attempts, and data integrity enforcement.
 *
 * Dependencies include authentication and all created entities to fully
 * test the expected failure modes.
 */
export async function test_api_task_status_change_creation_failure_pmo(
  connection: api.IConnection,
) {
  // 1. PMO user registration and authentication
  const pmoEmail = typia.random<string & tags.Format<"email">>();
  const pmoPassword = "pmo_password123";
  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, {
      body: {
        email: pmoEmail,
        password: pmoPassword,
        name: RandomGenerator.name(),
      } satisfies ITaskManagementPmo.IJoin,
    });
  typia.assert(pmoUser);

  // 2. TPM user registration and authentication
  const tpmEmail = typia.random<string & tags.Format<"email">>();
  const tpmPassword = "tpm_password123";
  const tpmUserAuthorized: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: {
        email: tpmEmail,
        password: tpmPassword,
        name: RandomGenerator.name(),
      } satisfies ITaskManagementTpm.IJoin,
    });
  typia.assert(tpmUserAuthorized);

  // 3. Create TPM user entity
  const tpmUser: ITaskManagementTpm =
    await api.functional.taskManagement.tpm.taskManagement.tpms.create(
      connection,
      {
        body: {
          email: tpmEmail,
          password_hash: typia.random<string>(),
          name: tpmUserAuthorized.name,
        } satisfies ITaskManagementTpm.ICreate,
      },
    );
  typia.assert(tpmUser);

  // 4. Create project owned by the TPM user
  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: {
        owner_id: tpmUser.id,
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ITaskManagementProject.ICreate,
    });
  typia.assert(project);

  // 5. Create board within the project
  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: {
        project_id: project.id,
        owner_id: tpmUser.id,
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ITaskManagementBoard.ICreate,
    });
  typia.assert(board);

  // 6. Create initial task status
  const initialStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      {
        body: {
          code: "to_do",
          name: "To Do",
          description: "Initial status for new tasks",
        } satisfies ITaskManagementTaskStatus.ICreate,
      },
    );
  typia.assert(initialStatus);

  // 7. Create new task status
  const newStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      {
        body: {
          code: "in_progress",
          name: "In Progress",
          description: "Status indicating work in progress",
        } satisfies ITaskManagementTaskStatus.ICreate,
      },
    );
  typia.assert(newStatus);

  // 8. Create a task priority
  const priority: ITaskManagementPriority =
    await api.functional.taskManagement.tpm.taskManagementPriorities.create(
      connection,
      {
        body: {
          code: "high",
          name: "High Priority",
          description: "Tasks with high importance",
        } satisfies ITaskManagementPriority.ICreate,
      },
    );
  typia.assert(priority);

  // 9. Create a task record
  const task: ITaskManagementTask =
    await api.functional.taskManagement.tpm.tasks.create(connection, {
      body: {
        status_id: initialStatus.id,
        priority_id: priority.id,
        creator_id: tpmUser.id,
        project_id: project.id,
        board_id: board.id,
        title: RandomGenerator.paragraph({ sentences: 4 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status_name: initialStatus.name,
        priority_name: priority.name,
        due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
      } satisfies ITaskManagementTask.ICreate,
    });
  typia.assert(task);

  // 10. PMO user login again to refresh token before status change attempts
  await api.functional.auth.pmo.login(connection, {
    body: {
      email: pmoEmail,
      password: pmoPassword,
    } satisfies ITaskManagementPmo.ILogin,
  });

  // 11. Attempt to create a status change with invalid taskId
  const invalidTaskId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should throw error for invalid taskId",
    async () => {
      await api.functional.taskManagement.pmo.tasks.statusChanges.create(
        connection,
        {
          taskId: invalidTaskId,
          body: {
            task_id: invalidTaskId,
            new_status_id: newStatus.id,
            changed_at: new Date().toISOString(),
            comment: "Invalid taskId test",
          } satisfies ITaskManagementTaskStatusChange.ICreate,
        },
      );
    },
  );

  // 12. Attempt to create a status change with invalid new_status_id
  const invalidStatusId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should throw error for invalid new_status_id",
    async () => {
      await api.functional.taskManagement.pmo.tasks.statusChanges.create(
        connection,
        {
          taskId: task.id,
          body: {
            task_id: task.id,
            new_status_id: invalidStatusId,
            changed_at: new Date().toISOString(),
            comment: "Invalid new_status_id test",
          } satisfies ITaskManagementTaskStatusChange.ICreate,
        },
      );
    },
  );

  // 13. Attempt to create a status change without authentication
  // Create a connection with empty headers to simulate no auth
  const unauthConn = { ...connection, headers: {} };

  await TestValidator.error(
    "should throw error without authentication",
    async () => {
      await api.functional.taskManagement.pmo.tasks.statusChanges.create(
        unauthConn,
        {
          taskId: task.id,
          body: {
            task_id: task.id,
            new_status_id: newStatus.id,
            changed_at: new Date().toISOString(),
            comment: "Unauthenticated test",
          } satisfies ITaskManagementTaskStatusChange.ICreate,
        },
      );
    },
  );
}
