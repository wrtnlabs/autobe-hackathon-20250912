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
 * This E2E test verifies the retrieval of a task status change record by a PMO
 * user with full authentication and proper business workflow. The test
 * encompasses the following steps:
 *
 * 1. Register a PMO user and authenticate to obtain a valid token.
 * 2. Register a TPM user to create the base entities required for a task.
 * 3. Create required base entities in sequence: TaskStatus, TaskPriority, Project,
 *    and Board.
 * 4. Create a Task entity by the TPM user with required associations.
 * 5. Create a TaskStatusChange entry linked with that Task.
 * 6. Authenticate as the PMO user and retrieve the created status change by its
 *    ID.
 * 7. Verify the retrieved data matches the created status change.
 * 8. Perform error validation for invalid UUIDs of taskId and statusChangeId.
 * 9. Verify unauthorized access rejection for unauthenticated attempts.
 *
 * This ensures the business logic of role-based access control, entity
 * creation, and retrieval of nested resources is verified end-to-end with valid
 * and invalid scenarios.
 *
 * Detailed validation at each stage includes typia.assert for response type
 * correctness and TestValidator assertions for business rule confirmations.
 * Error cases catch expected failures for invalid UUID format and missing
 * authentication.
 */
export async function test_api_task_status_change_retrieval_by_pmo(
  connection: api.IConnection,
) {
  // 1. Register PMO user (join + login)
  const pmoJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
  } satisfies ITaskManagementPmo.IJoin;

  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, {
      body: pmoJoinBody,
    });
  typia.assert(pmoUser);

  await api.functional.auth.pmo.login(connection, {
    body: {
      email: pmoJoinBody.email,
      password: pmoJoinBody.password,
    } satisfies ITaskManagementPmo.ILogin,
  });

  // 2. Register TPM user (join + login)
  const tpmJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
  } satisfies ITaskManagementTpm.IJoin;

  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: tpmJoinBody,
    });
  typia.assert(tpmUser);

  await api.functional.auth.tpm.login(connection, {
    body: {
      email: tpmJoinBody.email,
      password: tpmJoinBody.password,
    } satisfies ITaskManagementTpm.ILogin,
  });

  // 3. Create a TaskStatus
  const taskStatusCreateBody = {
    code: `ts_${RandomGenerator.alphaNumeric(5)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITaskManagementTaskStatus.ICreate;
  const taskStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      { body: taskStatusCreateBody },
    );
  typia.assert(taskStatus);

  // 4. Create a TaskPriority
  const taskPriorityCreateBody = {
    code: `tp_${RandomGenerator.alphaNumeric(5)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITaskManagementPriority.ICreate;
  const taskPriority: ITaskManagementPriority =
    await api.functional.taskManagement.tpm.taskManagementPriorities.create(
      connection,
      { body: taskPriorityCreateBody },
    );
  typia.assert(taskPriority);

  // 5. Create a Project
  const projectCreateBody = {
    owner_id: tpmUser.id,
    code: `pj_${RandomGenerator.alphaNumeric(5)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITaskManagementProject.ICreate;
  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(project);

  // 6. Create a Board within the Project
  const boardCreateBody = {
    project_id: project.id,
    owner_id: tpmUser.id,
    code: `bd_${RandomGenerator.alphaNumeric(5)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITaskManagementBoard.ICreate;
  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: boardCreateBody,
    });
  typia.assert(board);

  // 7. Create a Task
  const taskCreateBody = {
    status_id: taskStatus.id,
    priority_id: taskPriority.id,
    creator_id: tpmUser.id,
    project_id: project.id,
    board_id: board.id,
    title: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ITaskManagementTask.ICreate;
  const task: ITaskManagementTask =
    await api.functional.taskManagement.tpm.tasks.create(connection, {
      body: taskCreateBody,
    });
  typia.assert(task);

  // 8. Create a TaskStatusChange
  const statusChangeCreateBody = {
    task_id: task.id,
    new_status_id: taskStatus.id,
    changed_at: new Date().toISOString(),
    comment: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ITaskManagementTaskStatusChange.ICreate;
  const statusChange: ITaskManagementTaskStatusChange =
    await api.functional.taskManagement.tpm.tasks.statusChanges.create(
      connection,
      {
        taskId: task.id,
        body: statusChangeCreateBody,
      },
    );
  typia.assert(statusChange);

  // Switch authentication context to PMO user
  await api.functional.auth.pmo.login(connection, {
    body: {
      email: pmoJoinBody.email,
      password: pmoJoinBody.password,
    } satisfies ITaskManagementPmo.ILogin,
  });

  // 9. Retrieve the TaskStatusChange by PMO user
  const retrievedStatusChange: ITaskManagementTaskStatusChange =
    await api.functional.taskManagement.pmo.tasks.statusChanges.at(connection, {
      taskId: task.id,
      statusChangeId: statusChange.id,
    });
  typia.assert(retrievedStatusChange);
  TestValidator.equals(
    "retrieved statusChange id equals created",
    retrievedStatusChange.id,
    statusChange.id,
  );
  TestValidator.equals(
    "retrieved statusChange task id equals created task id",
    retrievedStatusChange.task_id,
    task.id,
  );

  // 10. Unauthorized access: no authentication (empty headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized access should be rejected",
    async () => {
      await api.functional.taskManagement.pmo.tasks.statusChanges.at(
        unauthConn,
        {
          taskId: task.id,
          statusChangeId: statusChange.id,
        },
      );
    },
  );
}
