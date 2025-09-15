import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This E2E test validates the delete operation of a task status change record
 * by a PM user.
 *
 * The test ensures that authorized PM users can delete a task status change
 * entry, and that unauthorized access or non-existent records result in
 * failure.
 *
 * The test performs the full business flow from user creation, role
 * authentication, project and task setup, task status change creation, to
 * deletion and validation.
 *
 * It tests both success and failure cases thoroughly, confirming authorization
 * enforcement and validation logic.
 */
export async function test_api_task_status_change_delete_pm_user_flow(
  connection: api.IConnection,
) {
  // 1. PM user registration and login
  const pmEmail: string = typia.random<string & tags.Format<"email">>();
  const pmPassword = "validPassword123";
  const pmJoinBody = {
    email: pmEmail,
    password: pmPassword,
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPm.ICreate;

  const pmUser: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, {
      body: pmJoinBody,
    });
  typia.assert(pmUser);

  await api.functional.auth.pm.login(connection, {
    body: {
      email: pmEmail,
      password: pmPassword,
    } satisfies ITaskManagementPm.ILogin,
  });

  // 2. TPM user registration and login
  const tpmEmail: string = typia.random<string & tags.Format<"email">>();
  const tpmPassword = "validPassword123";
  const tpmJoinBody = {
    email: tpmEmail,
    password: tpmPassword,
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;

  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: tpmJoinBody,
    });
  typia.assert(tpmUser);

  await api.functional.auth.tpm.login(connection, {
    body: {
      email: tpmEmail,
      password: tpmPassword,
    } satisfies ITaskManagementTpm.ILogin,
  });

  // 3. PM user registration and login for secondary PM (for unauthorized test)
  const pm2Email: string = typia.random<string & tags.Format<"email">>();
  const pm2Password = "validPassword123";
  const pm2JoinBody = {
    email: pm2Email,
    password: pm2Password,
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPm.ICreate;

  const pm2User: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, {
      body: pm2JoinBody,
    });
  typia.assert(pm2User);

  await api.functional.auth.pm.login(connection, {
    body: {
      email: pm2Email,
      password: pm2Password,
    } satisfies ITaskManagementPm.ILogin,
  });

  // 4. Create a Project owned by TPM user
  // Switch to TPM user context
  await api.functional.auth.tpm.login(connection, {
    body: {
      email: tpmEmail,
      password: tpmPassword,
    } satisfies ITaskManagementTpm.ILogin,
  });

  const projectCreateBody = {
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITaskManagementProject.ICreate;

  const project: ITaskManagementProject =
    await api.functional.taskManagement.pmo.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(project);

  // 5. Create a Board in the Project
  const boardCreateBody = {
    project_id: project.id,
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ITaskManagementBoard.ICreate;

  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: boardCreateBody,
    });
  typia.assert(board);

  // 6. Create a Task linked to Project, Board and TPM user as creator
  const taskCreateBody = {
    status_id: typia.random<string & tags.Format<"uuid">>(), // Random valid uuid for status
    priority_id: typia.random<string & tags.Format<"uuid">>(), // Random valid uuid for priority
    creator_id: tpmUser.id,
    project_id: project.id,
    board_id: board.id,
    title: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ITaskManagementTask.ICreate;

  const task: ITaskManagementTask =
    await api.functional.taskManagement.tpm.tasks.create(connection, {
      body: taskCreateBody,
    });
  typia.assert(task);

  // 7. Create a task status change record for the Task
  const statusChangeCreateBody = {
    task_id: task.id,
    new_status_id: typia.random<string & tags.Format<"uuid">>(),
    changed_at: new Date().toISOString(),
    comment: RandomGenerator.paragraph({ sentences: 1 }),
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

  // 8. Switch to PM user context for deletion
  await api.functional.auth.pm.login(connection, {
    body: {
      email: pmEmail,
      password: pmPassword,
    } satisfies ITaskManagementPm.ILogin,
  });

  // 9. Delete the task status change record by PM user
  await api.functional.taskManagement.pm.tasks.statusChanges.eraseStatusChange(
    connection,
    {
      taskId: task.id,
      statusChangeId: statusChange.id,
    },
  );

  // 10. Verify success by checking that deletion is effective
  //    Attempt to delete again should fail with error
  await TestValidator.error(
    "deleting non-existent statusChangeId should fail",
    async () => {
      await api.functional.taskManagement.pm.tasks.statusChanges.eraseStatusChange(
        connection,
        {
          taskId: task.id,
          statusChangeId: statusChange.id,
        },
      );
    },
  );

  // 11. Attempt deletion with unauthorized user (secondary PM user)
  await api.functional.auth.pm.login(connection, {
    body: {
      email: pm2Email,
      password: pm2Password,
    } satisfies ITaskManagementPm.ILogin,
  });

  await TestValidator.error(
    "unauthorized user cannot delete status change",
    async () => {
      await api.functional.taskManagement.pm.tasks.statusChanges.eraseStatusChange(
        connection,
        {
          taskId: task.id,
          statusChangeId: statusChange.id,
        },
      );
    },
  );
}
