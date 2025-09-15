import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPriority";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskComment";
import type { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

export async function test_api_task_comment_update_with_authentication_pm(
  connection: api.IConnection,
) {
  // 1. PM user registration
  const pmJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "PmPassword123!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPm.ICreate;

  const pmAuthorized: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, { body: pmJoinBody });
  typia.assert(pmAuthorized);

  // 2. PM user login
  const pmLoginBody = {
    email: pmJoinBody.email,
    password: pmJoinBody.password,
  } satisfies ITaskManagementPm.ILogin;

  const pmLoginAuthorized: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.login(connection, { body: pmLoginBody });
  typia.assert(pmLoginAuthorized);

  // 3. Create Task Status
  const taskStatusCreateBody = {
    code: `ts_${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITaskManagementTaskStatus.ICreate;

  const taskStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      { body: taskStatusCreateBody },
    );
  typia.assert(taskStatus);

  // 4. Create Task Priority
  const taskPriorityCreateBody = {
    code: `tp_${RandomGenerator.alphaNumeric(5)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ITaskManagementPriority.ICreate;

  const taskPriority: ITaskManagementPriority =
    await api.functional.taskManagement.tpm.taskManagementPriorities.create(
      connection,
      { body: taskPriorityCreateBody },
    );
  typia.assert(taskPriority);

  // 5. Create TPM user for Project ownership
  const tpmJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "TpmPassword123!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;

  const tpmAuthorized: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: tpmJoinBody });
  typia.assert(tpmAuthorized);

  // TPM user login
  const tpmLoginBody = {
    email: tpmJoinBody.email,
    password: tpmJoinBody.password,
  } satisfies ITaskManagementTpm.ILogin;

  const tpmLoginAuthorized: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, { body: tpmLoginBody });
  typia.assert(tpmLoginAuthorized);

  // 6. Create Project with TPM user as owner
  const projectCreateBody = {
    owner_id: tpmAuthorized.id,
    code: `prj_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(3),
    description: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ITaskManagementProject.ICreate;

  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(project);

  // 7. Create Board in Project with TPM owner
  const boardCreateBody = {
    project_id: project.id,
    owner_id: tpmAuthorized.id,
    code: `brd_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITaskManagementBoard.ICreate;

  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: boardCreateBody,
    });
  typia.assert(board);

  // 8. Create Task linked with status, priority, creator (PM user), project, board
  const taskCreateBody = {
    status_id: taskStatus.id,
    priority_id: taskPriority.id,
    creator_id: pmAuthorized.id,
    project_id: project.id,
    board_id: board.id,
    title: RandomGenerator.name(4),
    description: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ITaskManagementTask.ICreate;

  const task: ITaskManagementTask =
    await api.functional.taskManagement.tpm.tasks.create(connection, {
      body: taskCreateBody,
    });
  typia.assert(task);

  // 9. Create initial comment on the task with commenter_id (PM user)
  const commentCreateBody = {
    task_id: task.id,
    commenter_id: pmAuthorized.id,
    comment_body: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITaskManagementTaskComment.ICreate;

  const comment: ITaskManagementTaskComment =
    await api.functional.taskManagement.pm.tasks.comments.create(connection, {
      taskId: task.id,
      body: commentCreateBody,
    });
  typia.assert(comment);

  // 10. Update the comment with new comment body and updated_at
  const updatedCommentBody = {
    comment_body: RandomGenerator.paragraph({ sentences: 5 }),
    updated_at: new Date().toISOString(),
  } satisfies ITaskManagementTaskComment.IUpdate;

  const updatedComment: ITaskManagementTaskComment =
    await api.functional.taskManagement.pm.tasks.comments.update(connection, {
      taskId: task.id,
      commentId: comment.id,
      body: updatedCommentBody,
    });
  typia.assert(updatedComment);

  // Asserting that the updated body matches
  TestValidator.equals(
    "comment_body should be updated",
    updatedComment.comment_body,
    updatedCommentBody.comment_body,
  );

  // 11. Negative test: attempt to update comment with unauthorized user
  // Simulate by logging in as a different PM user and try to update comment

  // Create another PM user
  const pm2JoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "PmPassword456!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPm.ICreate;

  const pm2Authorized: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, { body: pm2JoinBody });
  typia.assert(pm2Authorized);

  // Login as second PM user
  const pm2LoginBody = {
    email: pm2JoinBody.email,
    password: pm2JoinBody.password,
  } satisfies ITaskManagementPm.ILogin;

  const pm2LoginAuthorized: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.login(connection, { body: pm2LoginBody });
  typia.assert(pm2LoginAuthorized);

  // Attempt unauthorized update should fail
  await TestValidator.error(
    "unauthorized PM cannot update someone else's comment",
    async () => {
      await api.functional.taskManagement.pm.tasks.comments.update(connection, {
        taskId: task.id,
        commentId: comment.id,
        body: {
          comment_body: "Unauthorized modification attempt",
        } satisfies ITaskManagementTaskComment.IUpdate,
      });
    },
  );

  // 12. Attempt update with empty comment_body (allowed as null or omitted?)
  // Since comment_body is optional, test updating no changes, should not fail
  const noChangeBody = {} satisfies ITaskManagementTaskComment.IUpdate;

  const noChangeComment =
    await api.functional.taskManagement.pm.tasks.comments.update(connection, {
      taskId: task.id,
      commentId: comment.id,
      body: noChangeBody,
    });
  typia.assert(noChangeComment);

  // 13. Attempt update with null comment_body should be accepted (if schema allows null)
  const nullCommentBody = {
    comment_body: null,
  } satisfies ITaskManagementTaskComment.IUpdate;

  const nullUpdatedComment =
    await api.functional.taskManagement.pm.tasks.comments.update(connection, {
      taskId: task.id,
      commentId: comment.id,
      body: nullCommentBody,
    });
  typia.assert(nullUpdatedComment);

  TestValidator.equals(
    "comment_body should be null after update",
    nullUpdatedComment.comment_body,
    null,
  );
}
