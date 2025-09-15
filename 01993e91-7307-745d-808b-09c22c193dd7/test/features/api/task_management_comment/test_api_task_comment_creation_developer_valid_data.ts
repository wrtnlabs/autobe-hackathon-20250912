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
 * E2E test for Developer user creating and fetching comments on a Task.
 *
 * This test verifies the complete process of authenticating Developer and
 * PMO users, creating a Task by PMO, and fetching comments filtered by the
 * Developer on that Task.
 *
 * Steps implemented:
 *
 * 1. Register Developer user with realistic email, name, and password hash.
 * 2. Register PMO user with realistic data.
 * 3. Login both users with appropriate credentials.
 * 4. PMO creates a valid Task referencing themselves as creator.
 * 5. Developer user fetches comments on the new Task filtered by their user id
 *    (commenter_id).
 * 6. Verify the comments page is empty as no comments exist yet.
 * 7. Validate that unauthenticated comment fetch attempts fail as expected.
 *
 * All API calls use exact DTO properties and types. Authentication headers
 * are automatically managed by the SDK. typia.assert performed on all API
 * responses to confirm type safety. TestValidator assertions with
 * descriptive titles validate expectations.
 */
export async function test_api_task_comment_creation_developer_valid_data(
  connection: api.IConnection,
) {
  // 1. Generate plaintext password for Developer user
  const developerPassword = RandomGenerator.alphaNumeric(12);

  // 2. Developer user join with password_hash (simulate hashed password)
  const developerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: developerPassword,
    name: RandomGenerator.name(),
    deleted_at: null,
  } satisfies ITaskManagementDeveloper.ICreate;
  const developer: ITaskManagementDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: developerJoinBody,
    });
  typia.assert(developer);

  // 3. PMO user join
  const pmoPassword = RandomGenerator.alphaNumeric(12);
  const pmoJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: pmoPassword,
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;
  const pmo: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, {
      body: pmoJoinBody,
    });
  typia.assert(pmo);

  // 4. PMO login
  const pmoLoginBody = {
    email: pmoJoinBody.email,
    password: pmoJoinBody.password,
  } satisfies ITaskManagementPmo.ILogin;
  const pmoLogin: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.login(connection, {
      body: pmoLoginBody,
    });
  typia.assert(pmoLogin);

  // 5. Developer login with plaintext password
  const developerLoginBody = {
    email: developerJoinBody.email,
    password: developerPassword,
  } satisfies ITaskManagementDeveloper.ILogin;
  const developerLogin: ITaskManagementDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, {
      body: developerLoginBody,
    });
  typia.assert(developerLogin);

  // 6. PMO creates a task referencing themselves as creator
  const newTaskBody = {
    status_id: typia.random<string & tags.Format<"uuid">>(),
    priority_id: typia.random<string & tags.Format<"uuid">>(),
    creator_id: pmo.id,
    project_id: null,
    board_id: null,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    status_name: null,
    priority_name: null,
    due_date: null,
  } satisfies ITaskManagementTask.ICreate;
  const task: ITaskManagementTask =
    await api.functional.taskManagement.pmo.tasks.create(connection, {
      body: newTaskBody,
    });
  typia.assert(task);

  TestValidator.equals(
    "created task creator id matches pmo id",
    task.creator_id,
    pmo.id,
  );

  // 7. Developer fetches comments filtered by their user ID and task ID
  const commentRequestBody = {
    page: 1,
    limit: 20,
    task_id: task.id,
    commenter_id: developer.id,
    comment_body: null,
    created_at_from: null,
    created_at_to: null,
    updated_at_from: null,
    updated_at_to: null,
  } satisfies ITaskManagementTaskComment.IRequest;

  const commentPage: IPageITaskManagementTaskComment.ISummary =
    await api.functional.taskManagement.pmo.tasks.comments.indexComments(
      connection,
      {
        taskId: task.id,
        body: commentRequestBody,
      },
    );
  typia.assert(commentPage);

  TestValidator.equals(
    "comment page pagination current page is 1",
    commentPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "comment page pagination limit is 20",
    commentPage.pagination.limit,
    20,
  );
  TestValidator.equals(
    "comment page data length is zero because no comments yet",
    commentPage.data.length,
    0,
  );

  // 8. Unauthenticated (no headers) comment fetch should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated comment fetch fails", async () => {
    await api.functional.taskManagement.pmo.tasks.comments.indexComments(
      unauthConn,
      {
        taskId: task.id,
        body: commentRequestBody,
      },
    );
  });
}
