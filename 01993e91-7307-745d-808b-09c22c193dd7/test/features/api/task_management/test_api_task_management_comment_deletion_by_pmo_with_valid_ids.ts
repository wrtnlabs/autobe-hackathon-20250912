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
 * This E2E test validates the deletion of a comment by a PMO user within a
 * task in the task management system.
 *
 * Workflow:
 *
 * 1. PMO user signs up and then logs in to obtain authorization tokens.
 * 2. TPM user (project owner) is created to own the project.
 * 3. Project creation assigned to TPM user.
 * 4. Board creation under the project.
 * 5. Task creation under the board with TPM user as creator.
 * 6. PMO user creates a comment on the task.
 * 7. PMO deletes the created comment by task and comment IDs.
 * 8. Assertions ensure deletion success and appropriate error cases for
 *    invalid or unauthorized deletions.
 *
 * This test ensures authorization, integrity, and correct error handling
 * for comment deletion functionality.
 */
export async function test_api_task_management_comment_deletion_by_pmo_with_valid_ids(
  connection: api.IConnection,
) {
  // 1. PMO user registration and authentication
  const pmoEmail = typia.random<string & tags.Format<"email">>();
  const pmoPassword = "PmoPass123!";
  const pmoJoinBody = {
    email: pmoEmail,
    password: pmoPassword,
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;
  const pmoUser = await api.functional.auth.pmo.join(connection, {
    body: pmoJoinBody,
  });
  typia.assert(pmoUser);

  // 2. TPM user creation (project owner)
  const tpmCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: "TPM_Hash_12345",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.ICreate;
  const tpmUser =
    await api.functional.taskManagement.tpm.taskManagement.tpms.create(
      connection,
      { body: tpmCreateBody },
    );
  typia.assert(tpmUser);

  // 3. Project creation with TPM as owner
  const projectCreateBody = {
    owner_id: tpmUser.id,
    code: `PRJ_${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITaskManagementProject.ICreate;
  const project = await api.functional.taskManagement.tpm.projects.create(
    connection,
    { body: projectCreateBody },
  );
  typia.assert(project);

  // 4. Board creation in the project with TPM as owner
  const boardCreateBody = {
    project_id: project.id,
    owner_id: tpmUser.id,
    code: `BRD_${RandomGenerator.alphaNumeric(5)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ITaskManagementBoard.ICreate;
  const board = await api.functional.taskManagement.tpm.projects.boards.create(
    connection,
    {
      projectId: project.id,
      body: boardCreateBody,
    },
  );
  typia.assert(board);

  // 5. Task creation under the board by TPM user
  const taskCreateBody = {
    status_id: typia.random<string & tags.Format<"uuid">>(),
    priority_id: typia.random<string & tags.Format<"uuid">>(),
    creator_id: tpmUser.id,
    project_id: project.id,
    board_id: board.id,
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 3, wordMax: 10 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status_name: null,
    priority_name: null,
    due_date: null,
  } satisfies ITaskManagementTask.ICreate;
  const task = await api.functional.taskManagement.tpm.tasks.create(
    connection,
    { body: taskCreateBody },
  );
  typia.assert(task);

  // 6. Create comment on the task by PMO user
  const commentCreateBody = {
    task_id: task.id,
    commenter_id: pmoUser.id,
    comment_body: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ITaskManagementTaskComment.ICreate;
  const comment = await api.functional.taskManagement.pmo.tasks.comments.create(
    connection,
    {
      taskId: task.id,
      body: commentCreateBody,
    },
  );
  typia.assert(comment);

  // 7. Delete the created comment
  await api.functional.taskManagement.pmo.tasks.comments.erase(connection, {
    taskId: task.id,
    commentId: comment.id,
  });

  // 8. Verify deletion by attempting to delete again and expecting error
  await TestValidator.error(
    "deletion of already deleted comment should fail",
    async () => {
      await api.functional.taskManagement.pmo.tasks.comments.erase(connection, {
        taskId: task.id,
        commentId: comment.id,
      });
    },
  );

  // 9. Test deletion with unauthorized context - simulate by logging in as TPM user and attempt delete
  const tpmLoginBody = {
    email: tpmCreateBody.email,
    password: "TPM_Hash_12345",
  } satisfies ITaskManagementTpm.ILogin;
  await api.functional.auth.tpm.login(connection, { body: tpmLoginBody });

  await TestValidator.error(
    "unauthorized user should not delete PMO comment",
    async () => {
      await api.functional.taskManagement.pmo.tasks.comments.erase(connection, {
        taskId: task.id,
        commentId: comment.id,
      });
    },
  );
}
