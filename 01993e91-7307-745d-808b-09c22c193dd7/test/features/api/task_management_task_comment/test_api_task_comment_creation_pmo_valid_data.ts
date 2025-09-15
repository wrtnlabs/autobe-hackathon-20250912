import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTaskComment";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskComment";

export async function test_api_task_comment_creation_pmo_valid_data(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a PMO user
  const pmoJoinInput = {
    email: `${RandomGenerator.alphaNumeric(8)}@test.com`,
    password: "P@ssw0rd12345678",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;
  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, { body: pmoJoinInput });
  typia.assert(pmoUser);

  // 2. Prepare a valid task linked to PMO
  const taskCreateInput = {
    status_id: typia.random<string & tags.Format<"uuid">>(),
    priority_id: typia.random<string & tags.Format<"uuid">>(),
    creator_id: pmoUser.id,
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 6, wordMax: 10 }),
  } satisfies ITaskManagementTask.ICreate;
  const task: ITaskManagementTask =
    await api.functional.taskManagement.pmo.tasks.create(connection, {
      body: taskCreateInput,
    });
  typia.assert(task);

  // 3. Submit comment filtering request
  const commentFilter: ITaskManagementTaskComment.IRequest = {
    page: 1,
    limit: 10,
    task_id: task.id,
    commenter_id: pmoUser.id,
  };

  const response: IPageITaskManagementTaskComment.ISummary =
    await api.functional.taskManagement.pmo.tasks.comments.indexComments(
      connection,
      {
        taskId: task.id,
        body: commentFilter,
      },
    );
  typia.assert(response);

  // 4. Validate response: Confirm pagination info and 0 or more comments
  TestValidator.predicate(
    "pagination exists",
    response.pagination !== undefined,
  );
  TestValidator.predicate("data is array", Array.isArray(response.data));

  // 5. For each comment, validate content and created_at
  for (const comment of response.data) {
    typia.assert(comment);
    TestValidator.predicate(
      "comment.id valid uuid",
      /^[0-9a-f-]{36}$/i.test(comment.id),
    );
    TestValidator.predicate(
      "comment body non-empty",
      typeof comment.comment_body === "string" &&
        comment.comment_body.length > 0,
    );
    TestValidator.predicate(
      "comment created_at valid ISO",
      typeof comment.created_at === "string" &&
        !isNaN(Date.parse(comment.created_at)),
    );
  }

  // 6. Test edge case: invalid taskId should raise error
  await TestValidator.error("invalid taskId returns error", async () => {
    await api.functional.taskManagement.pmo.tasks.comments.indexComments(
      connection,
      {
        taskId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          task_id: typia.random<string & tags.Format<"uuid">>(),
          commenter_id: pmoUser.id,
        } satisfies ITaskManagementTaskComment.IRequest,
      },
    );
  });

  // 7. Test unauthorized access (without authentication)
  const unauthConn: api.IConnection = { host: connection.host, headers: {} };
  await TestValidator.error("unauthenticated access fails", async () => {
    await api.functional.taskManagement.pmo.tasks.comments.indexComments(
      unauthConn,
      {
        taskId: task.id,
        body: {
          task_id: task.id,
          commenter_id: pmoUser.id,
        } satisfies ITaskManagementTaskComment.IRequest,
      },
    );
  });
}
