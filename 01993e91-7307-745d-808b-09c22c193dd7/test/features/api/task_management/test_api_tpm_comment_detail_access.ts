import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPriority";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskComment";
import type { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

export async function test_api_tpm_comment_detail_access(
  connection: api.IConnection,
) {
  // 1. TPM user joins to get authorized context
  const tpmJoinBody = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password: "SafePassword123!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const authorizedTpm: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: tpmJoinBody });
  typia.assert(authorizedTpm);

  // 2. Create TPM user for owner
  const tpmOwnerBody = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password_hash: "SafePassword123!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.ICreate;
  const tpmOwner: ITaskManagementTpm =
    await api.functional.taskManagement.tpm.taskManagement.tpms.create(
      connection,
      { body: tpmOwnerBody },
    );
  typia.assert(tpmOwner);

  // 3. Create Project with TPM owner
  const projectBody = {
    owner_id: tpmOwner.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ITaskManagementProject.ICreate;
  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: projectBody,
    });
  typia.assert(project);

  // 4. Create Board under project with TPM owner
  const boardBody = {
    project_id: project.id,
    owner_id: tpmOwner.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITaskManagementBoard.ICreate;
  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: boardBody,
    });
  typia.assert(board);

  // 5. Create TaskManagementTaskStatus
  const statusBody = {
    code: "to_do",
    name: "To Do",
    description: "Task has been created but not started yet",
  } satisfies ITaskManagementTaskStatus.ICreate;
  const taskStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      { body: statusBody },
    );
  typia.assert(taskStatus);

  // 6. Create TaskManagementPriority
  const priorityBody = {
    code: "medium",
    name: "Medium Priority",
    description: "Tasks with medium urgency",
  } satisfies ITaskManagementPriority.ICreate;
  const taskPriority: ITaskManagementPriority =
    await api.functional.taskManagement.tpm.taskManagementPriorities.create(
      connection,
      { body: priorityBody },
    );
  typia.assert(taskPriority);

  // 7. Create Task with all references and TPM user as creator
  const taskBody = {
    status_id: taskStatus.id,
    priority_id: taskPriority.id,
    creator_id: authorizedTpm.id,
    project_id: project.id,
    board_id: board.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    status_name: statusBody.name,
    priority_name: priorityBody.name,
    due_date: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(), // 7 days from now
  } satisfies ITaskManagementTask.ICreate;
  const task: ITaskManagementTask =
    await api.functional.taskManagement.tpm.tasks.create(connection, {
      body: taskBody,
    });
  typia.assert(task);

  // 8. Create Comment on the task
  const commentBody = {
    task_id: task.id,
    commenter_id: authorizedTpm.id,
    comment_body: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ITaskManagementTaskComment.ICreate;
  const comment: ITaskManagementTaskComment =
    await api.functional.taskManagement.tpm.tasks.comments.create(connection, {
      taskId: task.id,
      body: commentBody,
    });
  typia.assert(comment);

  // 9. Retrieve the comment detail
  const retrievedComment: ITaskManagementTaskComment =
    await api.functional.taskManagement.tpm.tasks.comments.at(connection, {
      taskId: task.id,
      commentId: comment.id,
    });
  typia.assert(retrievedComment);

  // 10. Validate that retrieved comment matches created comment
  TestValidator.equals("comment id match", retrievedComment.id, comment.id);
  TestValidator.equals(
    "task id match",
    retrievedComment.task_id,
    comment.task_id,
  );
  TestValidator.equals(
    "commenter id match",
    retrievedComment.commenter_id,
    comment.commenter_id,
  );
  TestValidator.equals(
    "comment body match",
    retrievedComment.comment_body,
    comment.comment_body,
  );
  TestValidator.equals(
    "created_at match",
    retrievedComment.created_at,
    comment.created_at,
  );
  TestValidator.equals(
    "updated_at match",
    retrievedComment.updated_at,
    comment.updated_at,
  );

  // 11. Attempt unauthorized access by a new random TPM user
  const unauthorizedJoinBody = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password: "SafePassword123!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const unauthorizedTpm: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: unauthorizedJoinBody,
    });
  typia.assert(unauthorizedTpm);

  // To simulate unauthorized access context, login unauthorized user
  await api.functional.auth.tpm.login(connection, {
    body: {
      email: unauthorizedJoinBody.email,
      password: unauthorizedJoinBody.password,
    } satisfies ITaskManagementTpm.ILogin,
  });

  // Try to get comment detail, expect error
  await TestValidator.error(
    "unauthorized user should not access comment detail",
    async () => {
      await api.functional.taskManagement.tpm.tasks.comments.at(connection, {
        taskId: task.id,
        commentId: comment.id,
      });
    },
  );

  // 12. Error test with invalid taskId/commentId
  await TestValidator.error(
    "fetching comment with non-existent taskId should fail",
    async () => {
      await api.functional.taskManagement.tpm.tasks.comments.at(connection, {
        taskId: typia.random<string & tags.Format<"uuid">>(),
        commentId: comment.id,
      });
    },
  );

  await TestValidator.error(
    "fetching comment with non-existent commentId should fail",
    async () => {
      await api.functional.taskManagement.tpm.tasks.comments.at(connection, {
        taskId: task.id,
        commentId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
