import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskComment";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * Complete E2E test for task comment creation with valid TPM user and task.
 *
 * This test executes a full business flow:
 *
 * 1. TPM user registers and authenticates.
 * 2. Creates a project owned by the TPM user.
 * 3. Creates a board in the project.
 * 4. Creates a task in the board with valid status and priority.
 * 5. Adds a comment to the task by the TPM user.
 * 6. Validates the comment is correctly created and linked.
 * 7. Tests error cases for invalid task IDs and missing required fields.
 *
 * It ensures strict adherence to business rules, role authorization, and
 * data integrity. The test uses realistic and format-valid UUIDs, ISO
 * date-times, and meaningful values for all properties.
 */

export async function test_api_task_comment_creation_with_valid_task_and_commenter(
  connection: api.IConnection,
) {
  // 1. TPM user registration
  const joinBody = {
    email: `user${RandomGenerator.alphaNumeric(8)}@test.com`,
    password: "TestPassword123!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const joinedUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: joinBody });
  typia.assert(joinedUser);

  // 2. TPM user login (optional if join does not auto-authenticate)
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies ITaskManagementTpm.ILogin;
  const loggedInUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, { body: loginBody });
  typia.assert(loggedInUser);

  // 3. Create project owned by TPM user
  const projectCreateBody = {
    owner_id: joinedUser.id,
    code: RandomGenerator.alphaNumeric(6).toUpperCase(),
    name: `Project ${RandomGenerator.name(2)}`,
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ITaskManagementProject.ICreate;
  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(project);

  // 4. Create a board in the project
  const boardCreateBody = {
    project_id: project.id,
    owner_id: joinedUser.id,
    code: RandomGenerator.alphaNumeric(6).toUpperCase(),
    name: `Board ${RandomGenerator.name(2)}`,
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ITaskManagementBoard.ICreate;
  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: boardCreateBody,
    });
  typia.assert(board);

  // 5. Prepare task creation info
  // For status and priority fields, we generate random UUIDs (assuming external data or setup)
  const statusId = typia.random<string & tags.Format<"uuid">>();
  const priorityId = typia.random<string & tags.Format<"uuid">>();

  const taskCreateBody = {
    status_id: statusId,
    priority_id: priorityId,
    creator_id: joinedUser.id,
    project_id: project.id,
    board_id: board.id,
    title: `Task ${RandomGenerator.name(3)}`,
    description: RandomGenerator.content({ paragraphs: 1 }),
    status_name: null,
    priority_name: null,
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  } satisfies ITaskManagementTask.ICreate;

  const task: ITaskManagementTask =
    await api.functional.taskManagement.tpm.tasks.create(connection, {
      body: taskCreateBody,
    });
  typia.assert(task);

  // 6. Create a comment on the task
  const commentCreateBody = {
    task_id: task.id,
    commenter_id: joinedUser.id,
    comment_body: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ITaskManagementTaskComment.ICreate;

  const comment: ITaskManagementTaskComment =
    await api.functional.taskManagement.tpm.tasks.comments.create(connection, {
      taskId: task.id,
      body: commentCreateBody,
    });
  typia.assert(comment);

  TestValidator.equals(
    "comment task_id matches task id",
    comment.task_id,
    task.id,
  );
  TestValidator.equals(
    "comment commenter_id matches TPM user id",
    comment.commenter_id,
    joinedUser.id,
  );
  TestValidator.predicate(
    "comment has non-empty body",
    typeof comment.comment_body === "string" && comment.comment_body.length > 0,
  );
  TestValidator.predicate(
    "comment has valid created_at timestamp",
    typeof comment.created_at === "string" && !!comment.created_at,
  );
  TestValidator.predicate(
    "comment has valid updated_at timestamp",
    typeof comment.updated_at === "string" && !!comment.updated_at,
  );

  // 7. Error handling: attempt to create comment with invalid taskId
  await TestValidator.error(
    "comment creation fails with invalid taskId",
    async () => {
      await api.functional.taskManagement.tpm.tasks.comments.create(
        connection,
        {
          taskId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            task_id: typia.random<string & tags.Format<"uuid">>(),
            commenter_id: joinedUser.id,
            comment_body: "This comment should fail due to invalid taskId",
          } satisfies ITaskManagementTaskComment.ICreate,
        },
      );
    },
  );

  // 8. Error handling: attempt to create comment with empty comment_body
  await TestValidator.error(
    "comment creation fails with empty comment_body",
    async () => {
      await api.functional.taskManagement.tpm.tasks.comments.create(
        connection,
        {
          taskId: task.id,
          body: {
            task_id: task.id,
            commenter_id: joinedUser.id,
            comment_body: "",
          } satisfies ITaskManagementTaskComment.ICreate,
        },
      );
    },
  );
}
