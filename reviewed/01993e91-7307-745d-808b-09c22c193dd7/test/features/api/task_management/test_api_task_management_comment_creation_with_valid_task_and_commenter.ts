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
 * This E2E test validates the creation of a comment by a developer on an
 * existing task, requiring a complex setup of multiple user roles and
 * resources.
 *
 * Steps:
 *
 * 1. TPM user creation and authentication.
 * 2. Developer user creation and authentication.
 * 3. TPM user creates a project and related board.
 * 4. TPM user creates a task under the board.
 * 5. Developer creates a comment on the task.
 * 6. Validates the comment creation success with associations and content.
 * 7. Test error cases for missing comment content and invalid taskId.
 */
export async function test_api_task_management_comment_creation_with_valid_task_and_commenter(
  connection: api.IConnection,
) {
  // Step 1: TPM user joins and logs in
  const tpmJoinBody = {
    email: `${RandomGenerator.alphaNumeric(4)}${RandomGenerator.alphabets(4)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;

  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: tpmJoinBody });
  typia.assert(tpmUser);

  await api.functional.auth.tpm.login(connection, {
    body: {
      email: tpmJoinBody.email,
      password: tpmJoinBody.password,
    } satisfies ITaskManagementTpm.ILogin,
  });

  // Step 2: Developer user joins and logs in (note password_hash is hashed password, but will use plain same string here for test)
  const password = RandomGenerator.alphaNumeric(12);
  const developerJoinBody = {
    email: `${RandomGenerator.alphaNumeric(4)}${RandomGenerator.alphabets(4)}@example.com`,
    password_hash: password,
    name: RandomGenerator.name(),
  } satisfies ITaskManagementDeveloper.ICreate;

  const developerUser: ITaskManagementDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: developerJoinBody,
    });
  typia.assert(developerUser);

  await api.functional.auth.developer.login(connection, {
    body: {
      email: developerJoinBody.email,
      password,
    } satisfies ITaskManagementDeveloper.ILogin,
  });

  // Step 3: TPM user creates a project
  const projectCreateBody = {
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ITaskManagementProject.ICreate;

  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(project);

  // Step 4: TPM user creates a board
  const boardCreateBody = {
    project_id: project.id,
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ITaskManagementBoard.ICreate;

  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: boardCreateBody,
    });
  typia.assert(board);

  // Step 5: TPM user creates a task under the board
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

  // Step 6: Developer creates comment on task
  const commentBody = {
    task_id: task.id,
    commenter_id: developerUser.id,
    comment_body: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ITaskManagementTaskComment.ICreate;

  const taskComment: ITaskManagementTaskComment =
    await api.functional.taskManagement.developer.tasks.comments.create(
      connection,
      { taskId: task.id, body: commentBody },
    );
  typia.assert(taskComment);

  TestValidator.equals(
    "TaskComment task_id matches the created task",
    taskComment.task_id,
    task.id,
  );
  TestValidator.equals(
    "TaskComment commenter_id matches the developer user",
    taskComment.commenter_id,
    developerUser.id,
  );
  TestValidator.predicate(
    "TaskComment comment_body has content",
    taskComment.comment_body.length > 0,
  );

  // Step 7: Error scenarios

  // Missing comment_body empty string
  await TestValidator.error(
    "Create comment fails when comment_body is empty",
    async () => {
      await api.functional.taskManagement.developer.tasks.comments.create(
        connection,
        {
          taskId: task.id,
          body: {
            task_id: task.id,
            commenter_id: developerUser.id,
            comment_body: "",
          } satisfies ITaskManagementTaskComment.ICreate,
        },
      );
    },
  );

  // Invalid taskId
  await TestValidator.error(
    "Create comment fails with invalid taskId",
    async () => {
      await api.functional.taskManagement.developer.tasks.comments.create(
        connection,
        {
          taskId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            task_id: task.id,
            commenter_id: developerUser.id,
            comment_body: RandomGenerator.content({ paragraphs: 1 }),
          } satisfies ITaskManagementTaskComment.ICreate,
        },
      );
    },
  );
}
