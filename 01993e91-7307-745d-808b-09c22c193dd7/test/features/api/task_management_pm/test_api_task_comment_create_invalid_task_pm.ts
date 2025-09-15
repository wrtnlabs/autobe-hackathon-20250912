import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskComment";

export async function test_api_task_comment_create_invalid_task_pm(
  connection: api.IConnection,
) {
  // 1. Register a new Project Manager user (PM)
  const pmCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPm.ICreate;

  const authorizedPm: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, {
      body: pmCreateBody,
    });
  typia.assert(authorizedPm);

  // 2. Attempt to create a comment on a non-existent task
  const invalidTaskId = typia.random<string & tags.Format<"uuid">>();

  const commentCreateBody = {
    task_id: invalidTaskId,
    commenter_id: authorizedPm.id,
    comment_body: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITaskManagementTaskComment.ICreate;

  await TestValidator.error(
    "create comment with invalid task ID should fail",
    async () => {
      await api.functional.taskManagement.pm.tasks.comments.create(connection, {
        taskId: invalidTaskId,
        body: commentCreateBody,
      });
    },
  );
}
