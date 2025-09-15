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
 * Validates the end-to-end successful creation of a task status change by a
 * PMO user.
 *
 * This test scenario covers multi-actor interaction including PMO user and
 * TPM user account creation and authentication, project and board setup
 * under TPM user, creation of task statuses for initial and target states,
 * priority creation, task creation with proper status and priority
 * associations, and PMO user creating a status change record for the task.
 *
 * The test strictly enforces schema compliance, role-based authentication,
 * and proper sequencing of API calls. Each API call uses strongly typed
 * request bodies and asserts response correctness using typia.assert().
 *
 * Validation includes checking the correct creation of entities with UUID
 * formats, ISO 8601 timestamps, and verifications with TestValidator for
 * logical consistency. Authentication switching is handled with login calls
 * per role requirements.
 *
 * This comprehensive test ensures all interconnected domain entities work
 * cohesively to support task status changes initiated by authorized PMO
 * users.
 */
export async function test_api_task_status_change_creation_success_pmo(
  connection: api.IConnection,
) {
  // 1. PMO user signs up
  const pmoEmail: string = typia.random<string & tags.Format<"email">>();
  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, {
      body: {
        email: pmoEmail,
        password: "ValidPass123!",
        name: RandomGenerator.name(),
      } satisfies ITaskManagementPmo.IJoin,
    });
  typia.assert(pmoUser);

  // 2. TPM user signs up
  const tpmEmail: string = typia.random<string & tags.Format<"email">>();
  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: {
        email: tpmEmail,
        password: "ValidPass123!",
        name: RandomGenerator.name(),
      } satisfies ITaskManagementTpm.IJoin,
    });
  typia.assert(tpmUser);

  // 3. TPM user creates a TPM user entity (tpms table) for management
  const tpmUserEntity: ITaskManagementTpm =
    await api.functional.taskManagement.tpm.taskManagement.tpms.create(
      connection,
      {
        body: {
          email: tpmEmail,
          password_hash: "HashedPass123!",
          name: tpmUser.name,
        } satisfies ITaskManagementTpm.ICreate,
      },
    );
  typia.assert(tpmUserEntity);

  // 4. TPM user creates a project
  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: {
        owner_id: tpmUserEntity.id,
        code: RandomGenerator.alphaNumeric(6),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ITaskManagementProject.ICreate,
    });
  typia.assert(project);

  // 5. TPM user creates a board inside the project
  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: {
        project_id: project.id,
        owner_id: tpmUserEntity.id,
        code: RandomGenerator.alphaNumeric(4),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITaskManagementBoard.ICreate,
    });
  typia.assert(board);

  // 6. Create initial task status
  const initialStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      {
        body: {
          code: "initial",
          name: "Initial Status",
          description: "Initial status for testing",
        } satisfies ITaskManagementTaskStatus.ICreate,
      },
    );
  typia.assert(initialStatus);

  // 7. Create new task status for status change
  const targetStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      {
        body: {
          code: "target",
          name: "Target Status",
          description: "Target status for status changes",
        } satisfies ITaskManagementTaskStatus.ICreate,
      },
    );
  typia.assert(targetStatus);

  // 8. Create a task priority
  const priority: ITaskManagementPriority =
    await api.functional.taskManagement.tpm.taskManagementPriorities.create(
      connection,
      {
        body: {
          code: "normal",
          name: "Normal Priority",
          description: "Standard priority for tasks",
        } satisfies ITaskManagementPriority.ICreate,
      },
    );
  typia.assert(priority);

  // 9. TPM user creates a task with initial status and priority
  const task: ITaskManagementTask =
    await api.functional.taskManagement.tpm.tasks.create(connection, {
      body: {
        status_id: initialStatus.id,
        priority_id: priority.id,
        creator_id: tpmUserEntity.id,
        project_id: project.id,
        board_id: board.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ITaskManagementTask.ICreate,
    });
  typia.assert(task);

  // 10. PMO user logs in to switch roles
  await api.functional.auth.pmo.login(connection, {
    body: {
      email: pmoEmail,
      password: "ValidPass123!",
    } satisfies ITaskManagementPmo.ILogin,
  });

  // 11. PMO user creates a task status change
  const statusChangeTimestamp = new Date().toISOString();
  const statusChange: ITaskManagementTaskStatusChange =
    await api.functional.taskManagement.pmo.tasks.statusChanges.create(
      connection,
      {
        taskId: task.id,
        body: {
          task_id: task.id,
          new_status_id: targetStatus.id,
          changed_at: statusChangeTimestamp,
          comment: "Status changed by PMO user",
        } satisfies ITaskManagementTaskStatusChange.ICreate,
      },
    );
  typia.assert(statusChange);

  // 12. Validate status change response fields
  TestValidator.equals(
    "status change task_id matches task",
    statusChange.task_id,
    task.id,
  );
  TestValidator.equals(
    "status change new_status_id matches target status",
    statusChange.new_status_id,
    targetStatus.id,
  );
  TestValidator.predicate(
    "status change has valid ISO date-time for changed_at",
    typeof statusChange.changed_at === "string" &&
      !isNaN(Date.parse(statusChange.changed_at)),
  );
  TestValidator.equals(
    "status change comment matches",
    statusChange.comment ?? null,
    "Status changed by PMO user",
  );
}
