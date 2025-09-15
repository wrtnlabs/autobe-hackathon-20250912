import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskComment";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * E2E test validating the detailed retrieval of a task's comment by an
 * authenticated Developer user.
 *
 * Scenario:
 *
 * 1. Developer user registers and logs in to obtain tokens.
 * 2. TPM user is created to act as the commenter.
 * 3. TPM user creates a project.
 * 4. TPM user creates a board under the project.
 * 5. TPM user creates a task assigned to the project and board.
 * 6. TPM user creates a comment on the task.
 * 7. Developer user retrieves the comment details using the GET comment detail
 *    endpoint.
 *
 * Validations include successful entity creations, accurate role-based
 * authentication, correct linkage of entities, and verifying the retrieved
 * comment matches created data. The test performs role switches between
 * Developer and TPM users and uses typia.assert for runtime type safety
 * validation, alongside TestValidator for business rules.
 *
 * This test ensures that only authorized Developer users can view comments
 * and that the comment data integrity is preserved through the lifecycle.
 */
export async function test_api_comment_detail_developer_authenticated(
  connection: api.IConnection,
) {
  // 1. Developer user joins
  const developerEmail = typia.random<string & tags.Format<"email">>();
  const developerPassword = RandomGenerator.alphaNumeric(12);
  const developer = await api.functional.auth.developer.join(connection, {
    body: {
      email: developerEmail,
      password_hash: developerPassword,
      name: RandomGenerator.name(),
      deleted_at: null,
    } satisfies ITaskManagementDeveloper.ICreate,
  });
  typia.assert(developer);

  // 2. Developer user logs in
  const developerLogin = await api.functional.auth.developer.login(connection, {
    body: {
      email: developerEmail,
      password: developerPassword,
    } satisfies ITaskManagementDeveloper.ILogin,
  });
  typia.assert(developerLogin);

  // 3. Create TPM user (commenter)
  const tpmUserEmail = typia.random<string & tags.Format<"email">>();
  const tpmUserPassword = RandomGenerator.alphaNumeric(12);
  const tpmUser =
    await api.functional.taskManagement.tpm.taskManagement.tpms.create(
      connection,
      {
        body: {
          email: tpmUserEmail,
          password_hash: tpmUserPassword,
          name: RandomGenerator.name(),
        } satisfies ITaskManagementTpm.ICreate,
      },
    );
  typia.assert(tpmUser);

  // 4. TPM user authenticates
  await api.functional.auth.tpm.login(connection, {
    body: {
      email: tpmUserEmail,
      password: tpmUserPassword,
    } satisfies ITaskManagementTpm.ILogin,
  });

  // 5. TPM user creates a project
  const projectCode = RandomGenerator.alphaNumeric(8);
  const project = await api.functional.taskManagement.tpm.projects.create(
    connection,
    {
      body: {
        owner_id: tpmUser.id,
        code: projectCode,
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({
          sentences: 4,
          wordMin: 4,
          wordMax: 10,
        }),
      } satisfies ITaskManagementProject.ICreate,
    },
  );
  typia.assert(project);

  // 6. TPM user creates a board under the project
  const boardCode = RandomGenerator.alphaNumeric(6);
  const board = await api.functional.taskManagement.tpm.projects.boards.create(
    connection,
    {
      projectId: project.id,
      body: {
        project_id: project.id,
        owner_id: tpmUser.id,
        code: boardCode,
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 8,
        }),
      } satisfies ITaskManagementBoard.ICreate,
    },
  );
  typia.assert(board);

  // 7. TPM user creates a task assigned to the project and board
  const taskStatusId = typia.random<string & tags.Format<"uuid">>();
  const taskPriorityId = typia.random<string & tags.Format<"uuid">>();
  const taskTitle = RandomGenerator.name(3);
  const taskDescription = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 5,
    wordMax: 9,
  });
  const taskDueDate = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const task = await api.functional.taskManagement.tpm.tasks.create(
    connection,
    {
      body: {
        status_id: taskStatusId,
        priority_id: taskPriorityId,
        creator_id: tpmUser.id,
        project_id: project.id,
        board_id: board.id,
        title: taskTitle,
        description: taskDescription,
        due_date: taskDueDate,
      } satisfies ITaskManagementTask.ICreate,
    },
  );
  typia.assert(task);

  // 8. TPM user creates a comment on the task
  const commentBody = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 8,
    wordMax: 12,
  });
  const comment = await api.functional.taskManagement.tpm.tasks.comments.create(
    connection,
    {
      taskId: task.id,
      body: {
        task_id: task.id,
        commenter_id: tpmUser.id,
        comment_body: commentBody,
      } satisfies ITaskManagementTaskComment.ICreate,
    },
  );
  typia.assert(comment);

  // 9. Switch to Developer user authentication
  await api.functional.auth.developer.login(connection, {
    body: {
      email: developerEmail,
      password: developerPassword,
    } satisfies ITaskManagementDeveloper.ILogin,
  });

  // 10. Developer user retrieves comment details
  const retrievedComment =
    await api.functional.taskManagement.developer.tasks.comments.at(
      connection,
      {
        taskId: task.id,
        commentId: comment.id,
      },
    );
  typia.assert(retrievedComment);

  // 11. Validate retrieved comment matches created comment data
  TestValidator.equals(
    "comment id should match",
    retrievedComment.id,
    comment.id,
  );
  TestValidator.equals(
    "task id should match",
    retrievedComment.task_id,
    comment.task_id,
  );
  TestValidator.equals(
    "commenter id should match",
    retrievedComment.commenter_id,
    comment.commenter_id,
  );
  TestValidator.equals(
    "comment body should match",
    retrievedComment.comment_body,
    comment.comment_body,
  );

  // No further manual validation of created_at and updated_at needed, typia.assert validates these
}
