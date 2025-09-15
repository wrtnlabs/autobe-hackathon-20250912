import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTaskComment";
import type { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskComment";

/**
 * E2E Test for Developer user comment creation and PMO user comment
 * retrieval on a Task.
 *
 * This test covers authentication of both roles, task creation by PMO,
 * comment creation by Developer, and comment retrieval by PMO with
 * validation of data integrity.
 *
 * Steps:
 *
 * 1. Developer joins (register) and logs in.
 * 2. PMO joins (register) and logs in.
 * 3. PMO creates a new task.
 * 4. Developer creates a comment on the task.
 * 5. PMO retrieves the list of comments on the task (using patch endpoint with
 *    taskId).
 * 6. Validate retrieved comments contain the expected comment.
 *
 * All operations assert returned data types and contents.
 */
export async function test_api_task_comment_retrieval_developer_success(
  connection: api.IConnection,
) {
  // Step 1: Developer user registration
  const developerUser: ITaskManagementDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: {
        email: `${RandomGenerator.alphaNumeric(8)}@test.com`,
        password_hash: RandomGenerator.alphaNumeric(16),
        name: RandomGenerator.name(),
        deleted_at: null,
      } satisfies ITaskManagementDeveloper.ICreate,
    });
  typia.assert(developerUser);

  // Step 2: PMO user registration
  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, {
      body: {
        email: `${RandomGenerator.alphaNumeric(8)}@test.com`,
        password: RandomGenerator.alphaNumeric(16),
        name: RandomGenerator.name(),
      } satisfies ITaskManagementPmo.IJoin,
    });
  typia.assert(pmoUser);

  // Step 3: PMO creates a new task
  const task: ITaskManagementTask =
    await api.functional.taskManagement.pmo.tasks.create(connection, {
      body: {
        status_id: typia.random<string & tags.Format<"uuid">>(),
        priority_id: typia.random<string & tags.Format<"uuid">>(),
        creator_id: pmoUser.id,
        project_id: null,
        board_id: null,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status_name: null,
        priority_name: null,
        due_date: null,
      } satisfies ITaskManagementTask.ICreate,
    });
  typia.assert(task);

  // Step 4: Developer creates a comment on the task
  const commentBody = RandomGenerator.paragraph({ sentences: 2 });
  const comment: ITaskManagementTaskComment =
    await api.functional.taskManagement.developer.tasks.comments.create(
      connection,
      {
        taskId: task.id,
        body: {
          task_id: task.id,
          commenter_id: developerUser.id,
          comment_body: commentBody,
        } satisfies ITaskManagementTaskComment.ICreate,
      },
    );
  typia.assert(comment);

  // Step 5: PMO retrieves comments on the task via patch endpoint
  const commentPage: IPageITaskManagementTaskComment.ISummary =
    await api.functional.taskManagement.pmo.tasks.comments.indexComments(
      connection,
      {
        taskId: task.id,
        body: {
          page: 1,
          limit: 10,
          task_id: task.id,
          commenter_id: developerUser.id,
          comment_body: commentBody,
          created_at_from: null,
          created_at_to: null,
          updated_at_from: null,
          updated_at_to: null,
        } satisfies ITaskManagementTaskComment.IRequest,
      },
    );
  typia.assert(commentPage);

  // Step 6: Validate retrieved comments include our created comment
  TestValidator.predicate(
    "comment page includes created comment",
    commentPage.data.some(
      (c) => c.id === comment.id && c.comment_body === commentBody,
    ),
  );
}
