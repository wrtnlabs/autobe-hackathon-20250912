import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskComment";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This E2E test verifies the successful creation of a comment by a PMO user on
 * a task.
 *
 * Process:
 *
 * 1. Register and authenticate PMO user.
 * 2. Register and authenticate TPM user.
 * 3. TPM user creates a project.
 * 4. TPM user creates a board under the project.
 * 5. TPM user creates a task with required references.
 * 6. PMO user creates a comment on the task.
 * 7. Assertions verify data correctness and linkage.
 */
export async function test_api_task_comment_creation_pmo_success(
  connection: api.IConnection,
) {
  // PMO user registration
  const pmoEmail = typia.random<string & tags.Format<"email">>();
  const pmoPassword = "validPassword123";
  const pmoUser = await api.functional.auth.pmo.join(connection, {
    body: {
      email: pmoEmail,
      password: pmoPassword,
      name: RandomGenerator.name(),
    } satisfies ITaskManagementPmo.IJoin,
  });
  typia.assert(pmoUser);

  // PMO user login
  const pmoAuth = await api.functional.auth.pmo.login(connection, {
    body: {
      email: pmoEmail,
      password: pmoPassword,
    } satisfies ITaskManagementPmo.ILogin,
  });
  typia.assert(pmoAuth);

  // TPM user registration
  const tpmEmail = typia.random<string & tags.Format<"email">>();
  const tpmPassword = "validPassword123";
  const tpmUser = await api.functional.auth.tpm.join(connection, {
    body: {
      email: tpmEmail,
      password: tpmPassword,
      name: RandomGenerator.name(),
    } satisfies ITaskManagementTpm.IJoin,
  });
  typia.assert(tpmUser);

  // TPM user login
  const tpmAuth = await api.functional.auth.tpm.login(connection, {
    body: {
      email: tpmEmail,
      password: tpmPassword,
    } satisfies ITaskManagementTpm.ILogin,
  });
  typia.assert(tpmAuth);

  // TPM user creates project
  const project = await api.functional.taskManagement.tpm.projects.create(
    connection,
    {
      body: {
        owner_id: tpmUser.id,
        code: RandomGenerator.alphaNumeric(6),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ITaskManagementProject.ICreate,
    },
  );
  typia.assert(project);

  // TPM user creates board
  const board = await api.functional.taskManagement.tpm.projects.boards.create(
    connection,
    {
      projectId: project.id,
      body: {
        project_id: project.id,
        owner_id: tpmUser.id,
        code: RandomGenerator.alphaNumeric(5),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITaskManagementBoard.ICreate,
    },
  );
  typia.assert(board);

  // TPM user creates task
  const task = await api.functional.taskManagement.tpm.tasks.create(
    connection,
    {
      body: {
        status_id: typia.random<string & tags.Format<"uuid">>(),
        priority_id: typia.random<string & tags.Format<"uuid">>(),
        creator_id: tpmUser.id,
        project_id: project.id,
        board_id: board.id,
        title: RandomGenerator.paragraph({ sentences: 4 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        status_name: "To Do",
        priority_name: "Normal",
        due_date: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      } satisfies ITaskManagementTask.ICreate,
    },
  );
  typia.assert(task);

  // PMO user login for correct authorization context
  await api.functional.auth.pmo.login(connection, {
    body: {
      email: pmoEmail,
      password: pmoPassword,
    } satisfies ITaskManagementPmo.ILogin,
  });

  // PMO user creates comment on the task
  const comment = await api.functional.taskManagement.pmo.tasks.comments.create(
    connection,
    {
      taskId: task.id,
      body: {
        task_id: task.id,
        commenter_id: pmoUser.id,
        comment_body: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ITaskManagementTaskComment.ICreate,
    },
  );
  typia.assert(comment);

  // Validate comment correctness
  TestValidator.equals(
    "comment task_id matches task id",
    comment.task_id,
    task.id,
  );
  TestValidator.equals(
    "comment commenter_id matches pmo user id",
    comment.commenter_id,
    pmoUser.id,
  );
  TestValidator.predicate(
    "comment body is non-empty",
    comment.comment_body.length > 0,
  );
  TestValidator.predicate(
    "comment created_at is a valid ISO date string",
    comment.created_at.length > 10,
  );
  TestValidator.predicate(
    "comment updated_at is a valid ISO date string",
    comment.updated_at.length > 10,
  );
}
