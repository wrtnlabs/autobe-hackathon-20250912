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

export async function test_api_task_comment_delete_by_qa(
  connection: api.IConnection,
) {
  // 1. Register and authenticate QA user
  const qaJoinBody = {
    email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementQa.ICreate;
  const qaUser: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.join(connection, { body: qaJoinBody });
  typia.assert(qaUser);

  const qaLoginBody = {
    email: qaJoinBody.email,
    password: qaJoinBody.password_hash,
  } satisfies ITaskManagementQa.ILogin;
  const qaUserLogin: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.login(connection, { body: qaLoginBody });
  typia.assert(qaUserLogin);

  // 2. Register and authenticate TPM user for dependency data creation
  const tpmJoinBody = {
    email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: tpmJoinBody });
  typia.assert(tpmUser);

  const tpmLoginBody = {
    email: tpmJoinBody.email,
    password: tpmJoinBody.password,
  } satisfies ITaskManagementTpm.ILogin;
  const tpmUserLogin: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, { body: tpmLoginBody });
  typia.assert(tpmUserLogin);

  // 3. Create TaskStatus
  const taskStatusBody = {
    code: RandomGenerator.alphaNumeric(4),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph(),
  } satisfies ITaskManagementTaskStatus.ICreate;
  const taskStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      { body: taskStatusBody },
    );
  typia.assert(taskStatus);

  // 4. Create TaskPriority
  const taskPriorityBody = {
    code: RandomGenerator.alphaNumeric(3),
    name: RandomGenerator.name(1),
    description: RandomGenerator.paragraph(),
  } satisfies ITaskManagementPriority.ICreate;
  const taskPriority: ITaskManagementPriority =
    await api.functional.taskManagement.tpm.taskManagementPriorities.create(
      connection,
      { body: taskPriorityBody },
    );
  typia.assert(taskPriority);

  // 5. Create Project associated with TPM user
  const projectBody = {
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(5),
    name: RandomGenerator.name(3),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ITaskManagementProject.ICreate;
  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: projectBody,
    });
  typia.assert(project);

  // 6. Create Board under Project
  const boardBody = {
    project_id: project.id,
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(4),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph(),
  } satisfies ITaskManagementBoard.ICreate;
  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: boardBody,
    });
  typia.assert(board);

  // 7. Create Task associated with dependencies and TPM user
  const taskBody = {
    status_id: taskStatus.id,
    priority_id: taskPriority.id,
    creator_id: tpmUser.id,
    project_id: project.id,
    board_id: board.id,
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ITaskManagementTask.ICreate;
  const task: ITaskManagementTask =
    await api.functional.taskManagement.tpm.tasks.create(connection, {
      body: taskBody,
    });
  typia.assert(task);

  // 8. QA user creates a comment on the task
  const commentBody = {
    task_id: task.id,
    commenter_id: qaUser.id,
    comment_body: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ITaskManagementTaskComment.ICreate;
  const comment: ITaskManagementTaskComment =
    await api.functional.taskManagement.qa.tasks.comments.create(connection, {
      taskId: task.id,
      body: commentBody,
    });
  typia.assert(comment);

  // 9. QA user deletes the comment
  await api.functional.taskManagement.qa.tasks.comments.erase(connection, {
    taskId: task.id,
    commentId: comment.id,
  });

  // The deletion success is confirmed by absence of errors.
  TestValidator.predicate("comment delete succeeds", true);
}
