import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPriority";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";
import type { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * Failure test for creating task status changes by QA users.
 *
 * This test performs all prerequisite steps of user registration for QA and
 * TPM, TPM user creation, project and board creation, task statuses and
 * priorities setup, task creation, followed by QA login and attempts to
 * create invalid status changes.
 *
 * It verifies that invalid task IDs (bad UUID), non-existent status IDs, or
 * missing authentication cause appropriate errors, enforcing security and
 * input validation.
 *
 * The test ensures robust permission checks that prevent unauthorized task
 * status changes by QA users.
 */
export async function test_api_task_status_change_creation_failure_qa(
  connection: api.IConnection,
) {
  // 1. QA user join
  const qaEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const qaJoinBody = {
    email: qaEmail,
    password_hash: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementQa.ICreate;
  const qaUser: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.join(connection, {
      body: qaJoinBody,
    });
  typia.assert(qaUser);

  // 2. TPM user join
  const tpmEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const tpmJoinBody = {
    email: tpmEmail,
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: tpmJoinBody,
    });
  typia.assert(tpmUser);

  // 3. Create TPM user entity (task_management_tpm)
  const tpmCreateBody = {
    email: tpmEmail,
    password_hash: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.ICreate;
  const tpmEntity: ITaskManagementTpm =
    await api.functional.taskManagement.tpm.taskManagement.tpms.create(
      connection,
      {
        body: tpmCreateBody,
      },
    );
  typia.assert(tpmEntity);

  // 4. Create a project with the TPM user as owner
  const projectCreateBody = {
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITaskManagementProject.ICreate;
  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(project);

  // 5. Create a board under the project
  const boardCreateBody = {
    project_id: project.id,
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITaskManagementBoard.ICreate;
  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: boardCreateBody,
    });
  typia.assert(board);

  // 6. Create initial and target task statuses
  const statusInitialCreateBody = {
    code: "initial",
    name: "Initial Status",
    description: "Starting status",
  } satisfies ITaskManagementTaskStatus.ICreate;
  const statusInitial: ITaskManagementTaskStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      {
        body: statusInitialCreateBody,
      },
    );
  typia.assert(statusInitial);

  const statusTargetCreateBody = {
    code: "target",
    name: "Target Status",
    description: "Target status",
  } satisfies ITaskManagementTaskStatus.ICreate;
  const statusTarget: ITaskManagementTaskStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      {
        body: statusTargetCreateBody,
      },
    );
  typia.assert(statusTarget);

  // 7. Create a task priority
  const priorityCreateBody = {
    code: "medium",
    name: "Medium Priority",
    description: "Medium level importance",
  } satisfies ITaskManagementPriority.ICreate;
  const priority: ITaskManagementPriority =
    await api.functional.taskManagement.tpm.taskManagementPriorities.create(
      connection,
      {
        body: priorityCreateBody,
      },
    );
  typia.assert(priority);

  // 8. Create a task entity
  const taskCreateBody = {
    status_id: statusInitial.id,
    priority_id: priority.id,
    creator_id: tpmUser.id,
    project_id: project.id,
    board_id: board.id,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    status_name: statusInitial.name,
    priority_name: priority.name,
    due_date: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
  } satisfies ITaskManagementTask.ICreate;
  const task: ITaskManagementTask =
    await api.functional.taskManagement.tpm.tasks.create(connection, {
      body: taskCreateBody,
    });
  typia.assert(task);

  // 9. QA user login
  const qaLoginBody = {
    email: qaEmail,
    password: qaJoinBody.password_hash,
  } satisfies ITaskManagementQa.ILogin;
  const qaUserLogin: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.login(connection, {
      body: qaLoginBody,
    });
  typia.assert(qaUserLogin);

  // Now attempt failure cases

  // 10. Attempt create status change with invalid taskId format
  await TestValidator.error(
    "invalid taskId format should cause error",
    async () => {
      await api.functional.taskManagement.qa.tasks.statusChanges.create(
        connection,
        {
          taskId: "invalid-uuid-format",
          body: {
            task_id: "invalid-uuid-format",
            new_status_id: statusTarget.id,
            changed_at: new Date().toISOString(),
            comment: "Invalid taskId format test",
          } satisfies ITaskManagementTaskStatusChange.ICreate,
        },
      );
    },
  );

  // 11. Attempt create status change with non-existent taskId (valid UUID)
  const nonExistentTaskId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent taskId should cause error",
    async () => {
      await api.functional.taskManagement.qa.tasks.statusChanges.create(
        connection,
        {
          taskId: nonExistentTaskId,
          body: {
            task_id: nonExistentTaskId,
            new_status_id: statusTarget.id,
            changed_at: new Date().toISOString(),
            comment: "Non-existent taskId test",
          } satisfies ITaskManagementTaskStatusChange.ICreate,
        },
      );
    },
  );

  // 12. Attempt create status change with non-existent new_status_id
  const nonExistentStatusId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent new_status_id should cause error",
    async () => {
      await api.functional.taskManagement.qa.tasks.statusChanges.create(
        connection,
        {
          taskId: task.id,
          body: {
            task_id: task.id,
            new_status_id: nonExistentStatusId,
            changed_at: new Date().toISOString(),
            comment: "Non-existent new_status_id test",
          } satisfies ITaskManagementTaskStatusChange.ICreate,
        },
      );
    },
  );

  // 13. Attempt create status change without login (simulate unauthenticated)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated create should cause error",
    async () => {
      await api.functional.taskManagement.qa.tasks.statusChanges.create(
        unauthConnection,
        {
          taskId: task.id,
          body: {
            task_id: task.id,
            new_status_id: statusTarget.id,
            changed_at: new Date().toISOString(),
            comment: "Unauthenticated test",
          } satisfies ITaskManagementTaskStatusChange.ICreate,
        },
      );
    },
  );
}
