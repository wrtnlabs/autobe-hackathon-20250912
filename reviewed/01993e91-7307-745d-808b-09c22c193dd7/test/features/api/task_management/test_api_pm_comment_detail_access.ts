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

/**
 * Validate fetching of comment details on a task as a PM user.
 *
 * This test implements a complete business workflow involving two user
 * roles:
 *
 * - TPM (Technical Project Manager): creates project, board, statuses,
 *   priorities, tasks, and also posts a comment on a task.
 * - PM (Project Manager): authenticates and fetches the comment detail on the
 *   task, validating response correctness and permissions.
 *
 * Steps:
 *
 * 1. TPM user joins and logs in
 * 2. TPM user creates a project
 * 3. TPM user creates a board under the project
 * 4. TPM user creates common task statuses
 * 5. TPM user creates common task priorities
 * 6. TPM user creates a task linked to project, board, status, and priority
 * 7. TPM user creates a comment on the task
 * 8. PM user joins and logs in
 * 9. PM user fetches the comment detail by taskId and commentId
 * 10. Validate that the fetched comment matches the created comment exactly
 *
 * All API calls use awaited SDK functions with strict typia assertions for
 * type safety. The test ensures proper creation and retrieval according to
 * business rules.
 */
export async function test_api_pm_comment_detail_access(
  connection: api.IConnection,
) {
  // 1. TPM user joins
  const tpmJoinBody = {
    email: `tpm${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "password123",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: tpmJoinBody,
    });
  typia.assert(tpmUser);

  // 2. TPM user logs in (re-authenticate)
  const tpmLoginBody = {
    email: tpmJoinBody.email,
    password: tpmJoinBody.password,
  } satisfies ITaskManagementTpm.ILogin;
  const tpmAuthorized: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, {
      body: tpmLoginBody,
    });
  typia.assert(tpmAuthorized);

  // 3. Create a project with TPM as owner
  const projectCreateBody = {
    owner_id: tpmAuthorized.id,
    code: `PRJ-${RandomGenerator.alphaNumeric(5)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ITaskManagementProject.ICreate;
  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(project);

  // 4. Create a board under the project, owned by TPM
  const boardCreateBody = {
    project_id: project.id,
    owner_id: tpmAuthorized.id,
    code: `BRD-${RandomGenerator.alphaNumeric(5)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITaskManagementBoard.ICreate;
  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: boardCreateBody,
    });
  typia.assert(board);

  // 5. Create common task statuses
  // For example, create one status "to_do"
  const statusCreateBody = {
    code: "to_do",
    name: "To Do",
    description: "Task needs to be done",
  } satisfies ITaskManagementTaskStatus.ICreate;
  const taskStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      {
        body: statusCreateBody,
      },
    );
  typia.assert(taskStatus);

  // 6. Create common task priorities
  // For example, create one priority "high"
  const priorityCreateBody = {
    code: "high",
    name: "High Priority",
    description: "Tasks with high importance",
  } satisfies ITaskManagementPriority.ICreate;
  const taskPriority: ITaskManagementPriority =
    await api.functional.taskManagement.tpm.taskManagementPriorities.create(
      connection,
      {
        body: priorityCreateBody,
      },
    );
  typia.assert(taskPriority);

  // 7. Create a task linked to project, board, status, priority and TPM creator
  const taskCreateBody = {
    status_id: taskStatus.id,
    priority_id: taskPriority.id,
    creator_id: tpmAuthorized.id,
    project_id: project.id,
    board_id: board.id,
    title: RandomGenerator.name(3),
    description: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ITaskManagementTask.ICreate;
  const task: ITaskManagementTask =
    await api.functional.taskManagement.tpm.tasks.create(connection, {
      body: taskCreateBody,
    });
  typia.assert(task);

  // 8. Create a comment on the task by TPM user
  const commentCreateBody = {
    task_id: task.id,
    commenter_id: tpmAuthorized.id,
    comment_body: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ITaskManagementTaskComment.ICreate;
  const comment: ITaskManagementTaskComment =
    await api.functional.taskManagement.tpm.tasks.comments.create(connection, {
      taskId: task.id,
      body: commentCreateBody,
    });
  typia.assert(comment);

  // 9. PM user joins
  const pmJoinBody = {
    email: `pm${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "pm_password123",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPm.ICreate;
  const pmUser: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, {
      body: pmJoinBody,
    });
  typia.assert(pmUser);

  // 10. PM user logs in
  const pmLoginBody = {
    email: pmJoinBody.email,
    password: pmJoinBody.password,
  } satisfies ITaskManagementPm.ILogin;
  const pmAuthorized: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.login(connection, {
      body: pmLoginBody,
    });
  typia.assert(pmAuthorized);

  // 11. PM fetches comment detail by taskId and commentId
  const fetchedComment: ITaskManagementTaskComment =
    await api.functional.taskManagement.pm.tasks.comments.at(connection, {
      taskId: task.id,
      commentId: comment.id,
    });
  typia.assert(fetchedComment);

  // 12. Validate fetched comment matches created comment
  TestValidator.equals("comment id matches", fetchedComment.id, comment.id);
  TestValidator.equals(
    "comment task id matches",
    fetchedComment.task_id,
    task.id,
  );
  TestValidator.equals(
    "comment commenter id matches",
    fetchedComment.commenter_id,
    tpmAuthorized.id,
  );
  TestValidator.equals(
    "comment body matches",
    fetchedComment.comment_body,
    comment.comment_body,
  );
  TestValidator.equals(
    "comment created_at matches",
    fetchedComment.created_at,
    comment.created_at,
  );
  TestValidator.equals(
    "comment updated_at matches",
    fetchedComment.updated_at,
    comment.updated_at,
  );
  TestValidator.equals(
    "comment deleted_at matches",
    fetchedComment.deleted_at ?? null,
    comment.deleted_at ?? null,
  );
}
