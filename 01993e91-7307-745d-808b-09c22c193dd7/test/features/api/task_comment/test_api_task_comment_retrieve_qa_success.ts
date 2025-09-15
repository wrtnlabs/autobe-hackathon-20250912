import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskAssignment";
import type { ITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskComment";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This E2E test verifies the complete workflow for a QA user successfully
 * retrieving a specific comment on a task, including user registration,
 * authorization, task assignment, comment creation, and accurate
 * retrieval.
 *
 * The test includes multi-role authentication for both QA and TPM user
 * roles, session role switching, and data integrity validation.
 *
 * Steps:
 *
 * 1. QA user registers and logs in.
 * 2. TPM user registers and logs in.
 * 3. TPM user creates a project.
 * 4. TPM user creates a board under the project.
 * 5. TPM user creates a task under project and board.
 * 6. TPM user assigns task to the QA user.
 * 7. QA user creates a comment on the assigned task.
 * 8. QA user retrieves the comment by taskId and commentId.
 *
 * Validation:
 *
 * - All API responses are type-asserted via typia for correctness.
 * - TestValidator.equals verifies relationships and data accuracy.
 * - Proper role switching ensures authorization and access control.
 * - The retrieved comment’s commenter_id matches the QA user’s ID.
 */
export async function test_api_task_comment_retrieve_qa_success(
  connection: api.IConnection,
) {
  // 1. QA user registers
  const qaUserEmail: string = typia.random<string & tags.Format<"email">>();
  const qaUserPassword = "P@ssw0rd123";
  const qaUserJoinBody = {
    email: qaUserEmail,
    password_hash: qaUserPassword,
    name: RandomGenerator.name(),
  } satisfies ITaskManagementQa.ICreate;
  const qaUser: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.join(connection, { body: qaUserJoinBody });
  typia.assert(qaUser);

  // 2. QA user logs in
  const qaUserLoginBody = {
    email: qaUserEmail,
    password: qaUserPassword,
  } satisfies ITaskManagementQa.ILogin;
  const qaUserLogin: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.login(connection, { body: qaUserLoginBody });
  typia.assert(qaUserLogin);

  // 3. TPM user registers
  const tpmUserEmail: string = typia.random<string & tags.Format<"email">>();
  const tpmUserPassword = "P@ssw0rd123";
  const tpmUserJoinBody = {
    email: tpmUserEmail,
    password: tpmUserPassword,
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: tpmUserJoinBody });
  typia.assert(tpmUser);

  // 4. TPM user logs in
  const tpmUserLoginBody = {
    email: tpmUserEmail,
    password: tpmUserPassword,
  } satisfies ITaskManagementTpm.ILogin;
  const tpmUserLogin: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, { body: tpmUserLoginBody });
  typia.assert(tpmUserLogin);

  // 5. TPM user creates a project
  const projectCreateBody = {
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(5),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ITaskManagementProject.ICreate;
  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(project);

  // 6. TPM user creates a board under the project
  const boardCreateBody = {
    project_id: project.id,
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(5),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ITaskManagementBoard.ICreate;
  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: boardCreateBody,
    });
  typia.assert(board);

  // 7. TPM user creates a task
  const taskCreateBody = {
    status_id: typia.random<string & tags.Format<"uuid">>(),
    priority_id: typia.random<string & tags.Format<"uuid">>(),
    creator_id: tpmUser.id,
    project_id: project.id,
    board_id: board.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ITaskManagementTask.ICreate;
  const task: ITaskManagementTask =
    await api.functional.taskManagement.tpm.tasks.create(connection, {
      body: taskCreateBody,
    });
  typia.assert(task);

  // 8. Assign task to QA user
  const assignmentCreateBody = {
    task_id: task.id,
    assignee_id: qaUser.id,
  } satisfies ITaskManagementTaskAssignment.ICreate;
  const assignment =
    await api.functional.taskManagement.tpm.tasks.assignments.createAssignment(
      connection,
      {
        taskId: task.id,
        body: assignmentCreateBody,
      },
    );
  typia.assert(assignment);

  // 9. QA user logs in again to ensure role switching
  const qaUserLoginSecond: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.login(connection, { body: qaUserLoginBody });
  typia.assert(qaUserLoginSecond);

  // 10. QA user creates a comment on the task
  const commentCreateBody = {
    task_id: task.id,
    commenter_id: qaUser.id,
    comment_body: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ITaskManagementTaskComment.ICreate;
  const comment: ITaskManagementTaskComment =
    await api.functional.taskManagement.qa.tasks.comments.create(connection, {
      taskId: task.id,
      body: commentCreateBody,
    });
  typia.assert(comment);

  // 11. QA user retrieves the comment
  const retrievedComment: ITaskManagementTaskComment =
    await api.functional.taskManagement.qa.tasks.comments.at(connection, {
      taskId: task.id,
      commentId: comment.id,
    });
  typia.assert(retrievedComment);

  // Validate the comment's commenter_id matches QA user id
  TestValidator.equals(
    "comment commenter_id matches qa user",
    retrievedComment.commenter_id,
    qaUser.id,
  );

  // Validate task_id matches
  TestValidator.equals(
    "comment task_id matches task",
    retrievedComment.task_id,
    task.id,
  );

  // Validate comment body matches
  TestValidator.equals(
    "comment body matches",
    retrievedComment.comment_body,
    comment.comment_body,
  );
}
