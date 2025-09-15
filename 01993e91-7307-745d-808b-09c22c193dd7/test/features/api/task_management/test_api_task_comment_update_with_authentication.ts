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

/**
 * This test validates the full user journey of updating a comment on a task
 * by a TPM (Technical Project Manager) user within the task management
 * domain. It covers all necessary authentication and data setup,
 * including:
 *
 * 1. Joining the system as a TPM user via /auth/tpm/join with a unique email,
 *    secure password, and name.
 * 2. Logging in as the TPM user via /auth/tpm/login to obtain valid JWT tokens
 *    enabling authorized actions.
 * 3. Creating required reference entities:
 *
 *    - A TaskStatus to provide a valid status reference for the new task.
 *    - A TaskPriority to specify the priority level associated with the task.
 *    - A Project serving as the organizational container for the task.
 *    - A Board within the created Project for task placement.
 * 4. Creating a new Task with valid references to the created status,
 *    priority, project, and board, and associating the task with the
 *    creator TPM user.
 * 5. Creating an initial comment on the task, associated with the TPM user as
 *    the commenter.
 * 6. Updating the created comment using the PUT
 *    /taskManagement/tpm/tasks/{taskId}/comments/{commentId} endpoint with
 *    an authenticated TPM user and valid update payload.
 * 7. Validating all HTTP responses via typia.assert() and ensuring data
 *    integrity through TestValidator checks.
 *
 * This end-to-end test ensures the comment update logic handles
 * authenticated TPM users and respects proper relational integrity within
 * tasks and comments.
 */
export async function test_api_task_comment_update_with_authentication(
  connection: api.IConnection,
) {
  // 1. TPM user registration
  const tpmEmail = typia.random<string & tags.Format<"email">>();
  const tpmPassword = "Password123!";
  const tpmJoinBody = {
    email: tpmEmail,
    password: tpmPassword,
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: tpmJoinBody });
  typia.assert(tpmUser);

  // 2. TPM user login
  const tpmLoginBody = {
    email: tpmEmail,
    password: tpmPassword,
  } satisfies ITaskManagementTpm.ILogin;
  await api.functional.auth.tpm.login(connection, { body: tpmLoginBody });

  // 3. Create TaskManagementTaskStatus entity
  const taskStatusBody = {
    code: `status_${RandomGenerator.alphaNumeric(5)}`,
    name: `Status ${RandomGenerator.name(1)}`,
    description: `Description ${RandomGenerator.paragraph({ sentences: 2 })}`,
  } satisfies ITaskManagementTaskStatus.ICreate;
  const taskStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      { body: taskStatusBody },
    );
  typia.assert(taskStatus);

  // 4. Create TaskManagementPriority entity
  const priorityCode = `priority_${RandomGenerator.alphaNumeric(5)}`;
  const priorityBody = {
    code: priorityCode,
    name: `Priority ${RandomGenerator.name(1)}`,
    description: `Priority description ${RandomGenerator.paragraph({ sentences: 2 })}`,
  } satisfies ITaskManagementPriority.ICreate;
  const priority: ITaskManagementPriority =
    await api.functional.taskManagement.tpm.taskManagementPriorities.create(
      connection,
      { body: priorityBody },
    );
  typia.assert(priority);

  // 5. Create Project entity owned by TPM user
  const projectBody = {
    owner_id: tpmUser.id,
    code: `project_${RandomGenerator.alphaNumeric(5)}`,
    name: `Project ${RandomGenerator.name(2)}`,
    description: `Project description ${RandomGenerator.paragraph({ sentences: 3 })}`,
  } satisfies ITaskManagementProject.ICreate;
  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: projectBody,
    });
  typia.assert(project);

  // 6. Create Board entity within Project
  const boardBody = {
    project_id: project.id,
    owner_id: tpmUser.id,
    code: `board_${RandomGenerator.alphaNumeric(5)}`,
    name: `Board ${RandomGenerator.name(2)}`,
    description: `Board description ${RandomGenerator.paragraph({ sentences: 2 })}`,
  } satisfies ITaskManagementBoard.ICreate;
  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: boardBody,
    });
  typia.assert(board);

  // 7. Create Task entity linking the created status, priority, creator TPM user, project and board
  const taskCreateBody = {
    status_id: taskStatus.id,
    priority_id: priority.id,
    creator_id: tpmUser.id,
    project_id: project.id,
    board_id: board.id,
    title: `Task ${RandomGenerator.paragraph({ sentences: 3 })}`,
    description: `Task description ${RandomGenerator.content({ paragraphs: 2 })}`,
  } satisfies ITaskManagementTask.ICreate;
  const task: ITaskManagementTask =
    await api.functional.taskManagement.tpm.tasks.create(connection, {
      body: taskCreateBody,
    });
  typia.assert(task);

  // 8. Create initial comment on the task
  const commentCreateBody = {
    task_id: task.id,
    commenter_id: tpmUser.id,
    comment_body: `Initial comment ${RandomGenerator.paragraph({ sentences: 3 })}`,
  } satisfies ITaskManagementTaskComment.ICreate;
  const comment: ITaskManagementTaskComment =
    await api.functional.taskManagement.tpm.tasks.comments.create(connection, {
      taskId: task.id,
      body: commentCreateBody,
    });
  typia.assert(comment);

  // 9. Update the created comment on the task
  const commentUpdateBody = {
    comment_body: `Updated comment ${RandomGenerator.paragraph({ sentences: 3 })}`,
    updated_at: new Date().toISOString(),
  } satisfies ITaskManagementTaskComment.IUpdate;
  const updatedComment: ITaskManagementTaskComment =
    await api.functional.taskManagement.tpm.tasks.comments.update(connection, {
      taskId: task.id,
      commentId: comment.id,
      body: commentUpdateBody,
    });
  typia.assert(updatedComment);

  // Validate essential properties after update
  TestValidator.equals(
    "comment update matches ID",
    updatedComment.id,
    comment.id,
  );
  TestValidator.equals(
    "comment update task_id",
    updatedComment.task_id,
    task.id,
  );
  TestValidator.equals(
    "comment update commenter_id",
    updatedComment.commenter_id,
    tpmUser.id,
  );
  TestValidator.equals(
    "comment body updated",
    updatedComment.comment_body,
    commentUpdateBody.comment_body,
  );
}
