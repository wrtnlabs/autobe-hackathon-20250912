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
 * This test validates the scenario where a PMO user updates a comment on a
 * task with valid task and comment IDs.
 *
 * Test flow:
 *
 * 1. PMO user joins and authenticates.
 * 2. TPM user joins and authenticates.
 * 3. TPM user creates a project.
 * 4. TPM user creates a board within the project.
 * 5. TPM user creates a task in the board with required status and priority.
 * 6. PMO user creates an initial comment on the task.
 * 7. PMO user authenticates again (role switching).
 * 8. PMO user updates the comment body on the task.
 * 9. Validates that the returned comment matches the update.
 *
 * Testing ensures:
 *
 * - Correct role-based access and switching
 * - Proper creation and updating of task comments
 * - Compliance with DTOs and API contracts
 */
export async function test_api_task_management_comment_update_by_pmo_with_valid_ids(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a PMO user
  const pmoJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;
  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, { body: pmoJoinBody });
  typia.assert(pmoUser);

  // 2. Create and authenticate a TPM user
  const tpmJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;

  const tpmUserCreated: ITaskManagementTpm =
    await api.functional.taskManagement.tpm.taskManagement.tpms.create(
      connection,
      {
        body: {
          email: tpmJoinBody.email,
          password_hash: tpmJoinBody.password,
          name: tpmJoinBody.name,
        } satisfies ITaskManagementTpm.ICreate,
      },
    );
  typia.assert(tpmUserCreated);

  const tpmLoginBody = {
    email: tpmJoinBody.email,
    password: tpmJoinBody.password,
  } satisfies ITaskManagementTpm.ILogin;
  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, { body: tpmLoginBody });
  typia.assert(tpmUser);

  // 3. TPM user creates a project
  const projectCreateBody = {
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ITaskManagementProject.ICreate;
  const project = await api.functional.taskManagement.tpm.projects.create(
    connection,
    {
      body: projectCreateBody,
    },
  );
  typia.assert(project);

  // 4. TPM user creates a board in the project
  const boardCreateBody = {
    project_id: project.id,
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(5),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITaskManagementBoard.ICreate;
  const board = await api.functional.taskManagement.tpm.projects.boards.create(
    connection,
    {
      projectId: project.id,
      body: boardCreateBody,
    },
  );
  typia.assert(board);

  // 5. TPM user creates a task in the board
  const taskCreateBody = {
    status_id: typia.random<string & tags.Format<"uuid">>(),
    priority_id: typia.random<string & tags.Format<"uuid">>(),
    creator_id: tpmUser.id,
    project_id: project.id,
    board_id: board.id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    status_name: "To Do",
    priority_name: "Medium",
    due_date: new Date(Date.now() + 86400000).toISOString(),
  } satisfies ITaskManagementTask.ICreate;
  const task = await api.functional.taskManagement.tpm.tasks.create(
    connection,
    {
      body: taskCreateBody,
    },
  );
  typia.assert(task);

  // 6. PMO user creates an initial comment on the task
  const commentCreateBody = {
    task_id: task.id,
    commenter_id: pmoUser.id,
    comment_body: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 5,
      wordMax: 15,
    }),
  } satisfies ITaskManagementTaskComment.ICreate;
  const comment = await api.functional.taskManagement.pmo.tasks.comments.create(
    connection,
    {
      taskId: task.id,
      body: commentCreateBody,
    },
  );
  typia.assert(comment);

  // 7. PMO user logs in again to re-authenticate
  const pmoLoginBody = {
    email: pmoJoinBody.email,
    password: pmoJoinBody.password,
  } satisfies ITaskManagementPmo.ILogin;
  const pmoUserLoggedIn: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.login(connection, { body: pmoLoginBody });
  typia.assert(pmoUserLoggedIn);

  // 8. PMO user updates the comment's comment_body
  const updatedCommentBody = {
    comment_body: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 5,
      wordMax: 20,
    }),
  } satisfies ITaskManagementTaskComment.IUpdate;
  const updatedComment =
    await api.functional.taskManagement.pmo.tasks.comments.update(connection, {
      taskId: task.id,
      commentId: comment.id,
      body: updatedCommentBody,
    });
  typia.assert(updatedComment);

  // 9. Validate updated comment
  TestValidator.equals(
    "updated comment has correct id",
    updatedComment.id,
    comment.id,
  );
  TestValidator.equals(
    "updated comment task id matches",
    updatedComment.task_id,
    task.id,
  );
  TestValidator.equals(
    "updated comment commenter id matches",
    updatedComment.commenter_id,
    pmoUserLoggedIn.id,
  );
  TestValidator.equals(
    "updated comment body matches",
    updatedComment.comment_body,
    updatedCommentBody.comment_body,
  );
  TestValidator.predicate(
    "updated comment updated_at is recent",
    new Date(updatedComment.updated_at).getTime() >=
      Date.now() - 10 * 60 * 1000, // within last 10m
  );
}
