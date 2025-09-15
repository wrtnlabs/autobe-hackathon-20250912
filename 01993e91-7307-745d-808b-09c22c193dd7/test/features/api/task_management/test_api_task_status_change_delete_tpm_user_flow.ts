import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This test function validates the complete flow for TPM user deleting a task
 * status change record. It covers registration and login of TPM (and PMO for
 * project creation), project creation, board creation, task creation, status
 * change creation, deletion of the status change, and assertion of deletion
 * success and error behaviors.
 *
 * Workflow:
 *
 * 1. TPM user signs up and logs in.
 * 2. PMO user signs up and logs in (for project creation).
 * 3. TPM user creates a TPM user account used as the creator.
 * 4. PMO user creates a project owned by the TPM user.
 * 5. TPM user creates a board inside the project.
 * 6. TPM user creates a task linked to the project, board, and the TPM creator.
 * 7. TPM user creates a task status change record for the task.
 * 8. TPM user deletes the task status change record successfully.
 * 9. TPM user attempts to delete with invalid ID expecting error.
 * 10. PMO user attempts deletion and expects an authorization error.
 */
export async function test_api_task_status_change_delete_tpm_user_flow(
  connection: api.IConnection,
) {
  // 1. TPM user sign-up
  const tpmJoinBody = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password: "P@ssw0rd1234",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const tpmAuthorized = await api.functional.auth.tpm.join(connection, {
    body: tpmJoinBody,
  });
  typia.assert(tpmAuthorized);

  // 2. TPM user login is redundant; SDK updates connection headers

  // 3. PMO user sign-up (used for project creation)
  const pmoJoinBody = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password: "P@ssw0rd4321",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;
  const pmoAuthorized = await api.functional.auth.pmo.join(connection, {
    body: pmoJoinBody,
  });
  typia.assert(pmoAuthorized);

  // 4. PMO user login is redundant; SDK updates connection headers

  // 5. Create TPM user account used as the creator of the task and project owner
  const tpmUserCreateBody = {
    email: RandomGenerator.alphaNumeric(12) + "@example.com",
    password_hash: "hashed_password_dummy",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.ICreate;
  const createdTpmUser =
    await api.functional.taskManagement.tpm.taskManagement.tpms.create(
      connection,
      { body: tpmUserCreateBody },
    );
  typia.assert(createdTpmUser);

  // 6. PMO user creates a project owned by the TPM user
  const projectCreateBody = {
    owner_id: createdTpmUser.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    description: null,
  } satisfies ITaskManagementProject.ICreate;
  const createdProject =
    await api.functional.taskManagement.pmo.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(createdProject);

  // 7. TPM user creates a board inside the project
  const boardCreateBody = {
    project_id: createdProject.id,
    owner_id: createdTpmUser.id,
    code: RandomGenerator.alphaNumeric(5),
    name: RandomGenerator.name(),
    description: null,
  } satisfies ITaskManagementBoard.ICreate;
  const createdBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: createdProject.id,
      body: boardCreateBody,
    });
  typia.assert(createdBoard);

  // 8. TPM user creates a task linked to the project, board, and TPM creator
  // Using random valid UUID for status and priority IDs
  const statusId = typia.random<string & tags.Format<"uuid">>();
  const priorityId = typia.random<string & tags.Format<"uuid">>();
  const taskCreateBody = {
    status_id: statusId,
    priority_id: priorityId,
    creator_id: createdTpmUser.id,
    project_id: createdProject.id,
    board_id: createdBoard.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: null,
    status_name: null,
    priority_name: null,
    due_date: null,
  } satisfies ITaskManagementTask.ICreate;
  const createdTask = await api.functional.taskManagement.tpm.tasks.create(
    connection,
    { body: taskCreateBody },
  );
  typia.assert(createdTask);

  // 9. TPM user creates a task status change record for the task
  const changedAt = new Date().toISOString();
  const statusChangeCreateBody = {
    task_id: createdTask.id,
    new_status_id: typia.random<string & tags.Format<"uuid">>(),
    changed_at: changedAt,
    comment: null,
  } satisfies ITaskManagementTaskStatusChange.ICreate;
  const createdStatusChange =
    await api.functional.taskManagement.tpm.tasks.statusChanges.create(
      connection,
      { taskId: createdTask.id, body: statusChangeCreateBody },
    );
  typia.assert(createdStatusChange);

  // 10. TPM user deletes the task status change record successfully
  await api.functional.taskManagement.tpm.tasks.statusChanges.eraseStatusChange(
    connection,
    {
      taskId: createdTask.id,
      statusChangeId: createdStatusChange.id,
    },
  );

  // 11. Attempt deletion with invalid ID expecting error
  await TestValidator.error(
    "deletion with invalid statusChangeId should fail",
    async () => {
      await api.functional.taskManagement.tpm.tasks.statusChanges.eraseStatusChange(
        connection,
        {
          taskId: createdTask.id,
          statusChangeId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 12. PMO user attempts deletion and expects authorization error
  await api.functional.auth.pmo.login(connection, {
    body: {
      email: pmoJoinBody.email,
      password: pmoJoinBody.password,
    } satisfies ITaskManagementPmo.ILogin,
  });

  await TestValidator.error(
    "PMO user unauthorized deletion attempt should fail",
    async () => {
      await api.functional.taskManagement.tpm.tasks.statusChanges.eraseStatusChange(
        connection,
        {
          taskId: createdTask.id,
          statusChangeId: createdStatusChange.id,
        },
      );
    },
  );
}
