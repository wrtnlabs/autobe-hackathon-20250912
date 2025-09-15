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
import type { ITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskComment";
import type { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This test validates the end-to-end flow of updating a comment on a task by an
 * authorized QA user. It covers user registration, authentication, setup of
 * task references, creation of a task and comment, the update of the comment,
 * and validation of access control and business logic constraints.
 *
 * Test steps:
 *
 * 1. Register and login QA user.
 * 2. Register and login TPM user.
 * 3. Create task status and priority.
 * 4. Create project and board owned by TPM.
 * 5. Create a task with references created.
 * 6. QA user creates a comment on the task.
 * 7. QA user updates the comment with new content.
 * 8. Assertions verifying update correctness.
 * 9. Validation of authorization boundaries and invalid update rejection.
 */
export async function test_api_task_comment_update_qa_authorized(
  connection: api.IConnection,
) {
  // 1. QA user registers
  const qaJoinBody = {
    email: `${RandomGenerator.name(1)}@test.com`,
    password_hash: "hashedpassword123",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementQa.ICreate;
  const qaAuthorized: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.join(connection, {
      body: qaJoinBody,
    });
  typia.assert(qaAuthorized);

  // 2. QA user logs in
  const qaLoginBody = {
    email: qaJoinBody.email,
    password: "hashedpassword123",
  } satisfies ITaskManagementQa.ILogin;
  const qaLoggedIn: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.login(connection, {
      body: qaLoginBody,
    });
  typia.assert(qaLoggedIn);

  // 3. TPM user registers
  const tpmJoinBody = {
    email: `${RandomGenerator.name(1)}@test.com`,
    password: "hashedpassword123",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const tpmAuthorized: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: tpmJoinBody,
    });
  typia.assert(tpmAuthorized);

  // 4. TPM user logs in
  const tpmLoginBody = {
    email: tpmJoinBody.email,
    password: "hashedpassword123",
  } satisfies ITaskManagementTpm.ILogin;
  const tpmLoggedIn: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, {
      body: tpmLoginBody,
    });
  typia.assert(tpmLoggedIn);

  // Create task status with unique code
  const taskStatusCode = `in_progress_${RandomGenerator.alphaNumeric(4)}`;
  const taskStatusBody = {
    code: taskStatusCode,
    name: "In Progress",
    description: "Task status representing ongoing work",
  } satisfies ITaskManagementTaskStatus.ICreate;
  const taskStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      {
        body: taskStatusBody,
      },
    );
  typia.assert(taskStatus);

  // Create task priority with unique code
  const priorityCode = `high_${RandomGenerator.alphaNumeric(4)}`;
  const priorityBody = {
    code: priorityCode,
    name: "High",
    description: "High priority tasks",
  } satisfies ITaskManagementPriority.ICreate;
  const priority: ITaskManagementPriority =
    await api.functional.taskManagement.tpm.taskManagementPriorities.create(
      connection,
      {
        body: priorityBody,
      },
    );
  typia.assert(priority);

  // Create project
  const projectCode = `project_${RandomGenerator.alphaNumeric(6)}`;
  const projectBody = {
    owner_id: tpmAuthorized.id,
    code: projectCode,
    name: `Project ${RandomGenerator.paragraph({ sentences: 2 })}`,
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ITaskManagementProject.ICreate;
  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: projectBody,
    });
  typia.assert(project);

  // Create board in project
  const boardCode = `board_${RandomGenerator.alphaNumeric(5)}`;
  const boardBody = {
    project_id: project.id,
    owner_id: tpmAuthorized.id,
    code: boardCode,
    name: `Board ${RandomGenerator.paragraph({ sentences: 2 })}`,
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ITaskManagementBoard.ICreate;
  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: boardBody,
    });
  typia.assert(board);

  // Create task
  const taskBody = {
    status_id: taskStatus.id,
    priority_id: priority.id,
    creator_id: tpmAuthorized.id,
    project_id: project.id,
    board_id: board.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ITaskManagementTask.ICreate;
  const task: ITaskManagementTask =
    await api.functional.taskManagement.tpm.tasks.create(connection, {
      body: taskBody,
    });
  typia.assert(task);

  // Switch to QA user authentication context before creating comment
  await api.functional.auth.qa.login(connection, {
    body: qaLoginBody,
  });

  // Create a comment on the task by QA user
  const commentCreateBody = {
    task_id: task.id,
    commenter_id: qaAuthorized.id,
    comment_body: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITaskManagementTaskComment.ICreate;
  const comment: ITaskManagementTaskComment =
    await api.functional.taskManagement.qa.tasks.comments.create(connection, {
      taskId: task.id,
      body: commentCreateBody,
    });
  typia.assert(comment);

  // Update the comment with new content
  const newCommentBody = {
    comment_body: RandomGenerator.paragraph({ sentences: 4 }),
    updated_at: new Date().toISOString(),
  } satisfies ITaskManagementTaskComment.IUpdate;
  const updatedComment: ITaskManagementTaskComment =
    await api.functional.taskManagement.qa.tasks.comments.update(connection, {
      taskId: task.id,
      commentId: comment.id,
      body: newCommentBody,
    });
  typia.assert(updatedComment);

  // Validate the updated comment content
  TestValidator.equals(
    "comment update content",
    updatedComment.comment_body,
    newCommentBody.comment_body,
  );

  // Validate timestamps
  TestValidator.predicate(
    "created_at is earlier than or equal to updated_at",
    updatedComment.created_at <= updatedComment.updated_at,
  );

  // Validate commenter id unchanged
  TestValidator.equals(
    "commenter_id remains unchanged",
    updatedComment.commenter_id,
    comment.commenter_id,
  );

  // Attempt unauthorized update: switch to TPM user (not the comment author)
  await api.functional.auth.tpm.login(connection, {
    body: tpmLoginBody,
  });
  await TestValidator.error(
    "unauthorized user cannot update comment",
    async () => {
      await api.functional.taskManagement.qa.tasks.comments.update(connection, {
        taskId: task.id,
        commentId: comment.id,
        body: {
          comment_body: "Unauthorized update attempt",
        } satisfies ITaskManagementTaskComment.IUpdate,
      });
    },
  );

  // Switch back to QA user for invalid update
  await api.functional.auth.qa.login(connection, {
    body: qaLoginBody,
  });

  // Attempt update with invalid data (empty comment_body should fail)
  await TestValidator.error(
    "update with empty comment_body fails",
    async () => {
      await api.functional.taskManagement.qa.tasks.comments.update(connection, {
        taskId: task.id,
        commentId: comment.id,
        body: {
          comment_body: "",
        } satisfies ITaskManagementTaskComment.IUpdate,
      });
    },
  );
}
