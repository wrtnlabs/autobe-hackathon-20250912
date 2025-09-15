import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";
import type { ITaskManagementPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPriority";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";
import type { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This E2E test validates failure scenarios where a Developer user attempts to
 * create task status change records for a task, triggering expected business
 * logic errors due to invalid data or authorization issues.
 *
 * The scenario's business context involves multiple user roles: Developer and
 * TPM.
 *
 * The complete test workflow:
 *
 * 1. Developer signs up and logs in, obtaining Developer user credentials and
 *    authentication.
 * 2. TPM signs up and logs in, establishing a TPM user with privileges.
 * 3. TPM creates a TPM user entity.
 * 4. TPM creates a project.
 * 5. TPM creates a board under the project.
 * 6. TPM creates two task statuses: initial and new status.
 * 7. TPM creates a priority level.
 * 8. TPM creates a task with the previously created status, priority, project,
 *    board, and TPM user as the creator.
 * 9. Developer logs in to simulate role-based access.
 * 10. Developer attempts to create a task status change with an invalid task ID
 *     (non-existent UUID), expecting failure.
 * 11. Developer attempts to create a task status change with an invalid new status
 *     ID (non-existent UUID), expecting failure.
 * 12. Developer attempts to create a task status change without authentication
 *     (unauthenticated connection), expecting failure.
 *
 * Each step includes API invocation with realistic randomized data respecting
 * schema and format requirements. Responses are typia.asserted for type safety.
 * Expected failures are validated using TestValidator.error with async-await
 * and descriptive titles.
 *
 * This test ensures that the system properly enforces data integrity and
 * authorization policies, protecting task status changes from invalid operation
 * and unwanted access.
 */
export async function test_api_task_status_change_creation_failure_developer(
  connection: api.IConnection,
) {
  // 1. Developer user joins
  const developerUser: ITaskManagementDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: "SecurePassword123!",
        name: RandomGenerator.name(),
      } satisfies ITaskManagementDeveloper.ICreate,
    });
  typia.assert(developerUser);

  // 2. TPM user joins
  const tpmUserJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePassword123!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;

  const tpmUserAuthorized1: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: tpmUserJoinBody,
    });
  typia.assert(tpmUserAuthorized1);

  // 3. TPM application user creation
  const tpmCreatedUser: ITaskManagementTpm =
    await api.functional.taskManagement.tpm.taskManagement.tpms.create(
      connection,
      {
        body: {
          email: tpmUserJoinBody.email,
          name: tpmUserJoinBody.name,
          password_hash: "SecurePassword123!",
        } satisfies ITaskManagementTpm.ICreate,
      },
    );
  typia.assert(tpmCreatedUser);

  // 4. TPM project creation
  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: {
        owner_id: tpmCreatedUser.id,
        code: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 10,
        }),
        name: RandomGenerator.name(),
        description: "Project for testing task status change failure",
      } satisfies ITaskManagementProject.ICreate,
    });
  typia.assert(project);

  // 5. TPM board creation
  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: {
        project_id: project.id,
        owner_id: tpmCreatedUser.id,
        code: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 10,
        }),
        name: RandomGenerator.name(),
        description: "Board for testing",
      } satisfies ITaskManagementBoard.ICreate,
    });
  typia.assert(board);

  // 6. Create initial and new task statuses
  const initialStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      {
        body: {
          code: "to_do",
          name: "To Do",
          description: "Initial task status",
        } satisfies ITaskManagementTaskStatus.ICreate,
      },
    );
  typia.assert(initialStatus);

  const newStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      {
        body: {
          code: "in_progress",
          name: "In Progress",
          description: "New task status",
        } satisfies ITaskManagementTaskStatus.ICreate,
      },
    );
  typia.assert(newStatus);

  // 7. Create task priority
  const priority: ITaskManagementPriority =
    await api.functional.taskManagement.tpm.taskManagementPriorities.create(
      connection,
      {
        body: {
          code: "medium",
          name: "Medium",
          description: "Medium priority",
        } satisfies ITaskManagementPriority.ICreate,
      },
    );
  typia.assert(priority);

  // 8. Create task for status change
  const task: ITaskManagementTask =
    await api.functional.taskManagement.tpm.tasks.create(connection, {
      body: {
        status_id: initialStatus.id,
        priority_id: priority.id,
        creator_id: tpmCreatedUser.id,
        project_id: project.id,
        board_id: board.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: null,
        status_name: initialStatus.name,
        priority_name: priority.name,
        due_date: null,
      } satisfies ITaskManagementTask.ICreate,
    });
  typia.assert(task);

  // 9. Developer logs in
  await api.functional.auth.developer.login(connection, {
    body: {
      email: developerUser.email,
      password: "SecurePassword123!",
    } satisfies ITaskManagementDeveloper.ILogin,
  });

  // 10. Developer tries to create a task status change with invalid taskId
  await TestValidator.error(
    "Invalid taskId UUID format should cause failure",
    async () => {
      await api.functional.taskManagement.developer.tasks.statusChanges.create(
        connection,
        {
          taskId: typia.random<string & tags.Format<"uuid">>(), // random UUID but does not correspond to an existing task
          body: {
            task_id: typia.random<string & tags.Format<"uuid">>(),
            new_status_id: newStatus.id,
            changed_at: new Date().toISOString(),
            comment: "Invalid taskId test",
          } satisfies ITaskManagementTaskStatusChange.ICreate,
        },
      );
    },
  );

  // 11. Developer tries to create a task status change with invalid new_status_id
  await TestValidator.error(
    "Invalid new_status_id UUID format should cause failure",
    async () => {
      await api.functional.taskManagement.developer.tasks.statusChanges.create(
        connection,
        {
          taskId: task.id,
          body: {
            task_id: task.id,
            new_status_id: typia.random<string & tags.Format<"uuid">>(),
            changed_at: new Date().toISOString(),
            comment: "Invalid new_status_id test",
          } satisfies ITaskManagementTaskStatusChange.ICreate,
        },
      );
    },
  );

  // 12. Developer tries to create a task status change without authentication
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "Unauthenticated creation of task status change should fail",
    async () => {
      await api.functional.taskManagement.developer.tasks.statusChanges.create(
        unauthenticatedConnection,
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
