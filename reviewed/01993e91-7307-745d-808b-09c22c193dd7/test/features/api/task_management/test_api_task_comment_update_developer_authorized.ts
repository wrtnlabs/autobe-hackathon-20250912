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
import type { ITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskComment";
import type { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This test function verifies the authorized developer user's ability to update
 * a task comment.
 *
 * It involves registering and logging in both a developer and a TPM user. The
 * TPM user creates required entities including task statuses, priorities, a
 * project, a board, and a task.
 *
 * The developer user creates a comment on the task and then updates the content
 * of that comment.
 *
 * The function asserts all responses using typia to guarantee strict type
 * correctness and uses TestValidator to ensure updated comment content is
 * persisted.
 *
 * Role authentication is handled explicitly by performing login calls before
 * each role's privileged operations to ensure correct authorization context.
 */
export async function test_api_task_comment_update_developer_authorized(
  connection: api.IConnection,
) {
  // === Developer registration and login preparation ===
  const developerPlainPassword = RandomGenerator.alphaNumeric(32);
  const developerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: developerPlainPassword,
    name: RandomGenerator.name(),
  } satisfies ITaskManagementDeveloper.ICreate;

  const developer = await api.functional.auth.developer.join(connection, {
    body: developerJoinBody,
  });
  typia.assert(developer);

  await api.functional.auth.developer.login(connection, {
    body: {
      email: developer.email,
      password: developerPlainPassword,
    } satisfies ITaskManagementDeveloper.ILogin,
  });

  // === TPM registration and login preparation ===
  const tpmPlainPassword = RandomGenerator.alphaNumeric(32);
  const tpmJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: tpmPlainPassword,
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;

  const tpmUser = await api.functional.auth.tpm.join(connection, {
    body: tpmJoinBody,
  });
  typia.assert(tpmUser);

  await api.functional.auth.tpm.login(connection, {
    body: {
      email: tpmUser.email,
      password: tpmPlainPassword,
    } satisfies ITaskManagementTpm.ILogin,
  });

  // === Create task status with TPM role ===
  const taskStatusBody = {
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ITaskManagementTaskStatus.ICreate;
  const status =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      {
        body: taskStatusBody,
      },
    );
  typia.assert(status);

  // === Create task priority with TPM role ===
  const priorityBody = {
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ITaskManagementPriority.ICreate;
  const priority =
    await api.functional.taskManagement.tpm.taskManagementPriorities.create(
      connection,
      {
        body: priorityBody,
      },
    );
  typia.assert(priority);

  // === Create project with TPM role ===
  const projectBody = {
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ITaskManagementProject.ICreate;
  const project = await api.functional.taskManagement.tpm.projects.create(
    connection,
    {
      body: projectBody,
    },
  );
  typia.assert(project);

  // === Create board under project with TPM role ===
  const boardBody = {
    project_id: project.id,
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITaskManagementBoard.ICreate;
  const board = await api.functional.taskManagement.tpm.projects.boards.create(
    connection,
    {
      projectId: project.id,
      body: boardBody,
    },
  );
  typia.assert(board);

  // === Create a task related to status, priority, project, board, and creator TPM user ===
  const taskBody = {
    status_id: status.id,
    priority_id: priority.id,
    creator_id: tpmUser.id,
    project_id: project.id,
    board_id: board.id,
    title: RandomGenerator.name(3),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ITaskManagementTask.ICreate;
  const task = await api.functional.taskManagement.tpm.tasks.create(
    connection,
    {
      body: taskBody,
    },
  );
  typia.assert(task);

  // === Developer creates new comment on the task ===
  const commentCreateBody = {
    task_id: task.id,
    commenter_id: developer.id,
    comment_body: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ITaskManagementTaskComment.ICreate;
  const comment =
    await api.functional.taskManagement.developer.tasks.comments.create(
      connection,
      {
        taskId: task.id,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  // === Developer updates the comment content ===
  const newCommentBody = {
    comment_body: RandomGenerator.paragraph({ sentences: 3 }),
    updated_at: new Date().toISOString(),
  } satisfies ITaskManagementTaskComment.IUpdate;
  const updatedComment =
    await api.functional.taskManagement.developer.tasks.comments.update(
      connection,
      {
        taskId: task.id,
        commentId: comment.id,
        body: newCommentBody,
      },
    );
  typia.assert(updatedComment);

  // === Assertions to verify that the update is persisted ===
  TestValidator.equals(
    "comment id must remain the same",
    updatedComment.id,
    comment.id,
  );
  TestValidator.equals(
    "comment content should be updated",
    updatedComment.comment_body,
    newCommentBody.comment_body,
  );
}
