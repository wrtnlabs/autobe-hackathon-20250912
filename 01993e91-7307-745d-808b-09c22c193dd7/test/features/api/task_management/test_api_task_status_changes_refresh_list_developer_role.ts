import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTaskStatusChange";
import type { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";
import type { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";

export async function test_api_task_status_changes_refresh_list_developer_role(
  connection: api.IConnection,
) {
  // 1. Developer sign up and authenticate
  const email = typia.random<string & tags.Format<"email">>();
  const passwordHash = RandomGenerator.alphaNumeric(64); // Random 64 char hash string
  const name = RandomGenerator.name();

  const developer = await api.functional.auth.developer.join(connection, {
    body: {
      email,
      password_hash: passwordHash,
      name,
    } satisfies ITaskManagementDeveloper.ICreate,
  });
  typia.assert(developer);

  // 2. Use a valid UUID for taskId
  const taskId = typia.random<string & tags.Format<"uuid">>();

  // 3. Prepare request body with pagination and filtering
  const requestBody = {
    task_id: taskId,
    page: 1,
    limit: 10,
  } satisfies ITaskManagementTaskStatusChange.IRequest;

  // 4. Call the status changes listing API
  const statusChanges =
    await api.functional.taskManagement.developer.tasks.statusChanges.index(
      connection,
      {
        taskId,
        body: requestBody,
      },
    );
  typia.assert(statusChanges);

  // 5. Validate pagination metadata
  TestValidator.equals(
    "pagination.current page",
    statusChanges.pagination.current,
    1,
  );
  TestValidator.equals("pagination.limit", statusChanges.pagination.limit, 10);
  TestValidator.predicate(
    "pagination.records non-negative",
    statusChanges.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages non-negative",
    statusChanges.pagination.pages >= 0,
  );

  // 6. Validate each status change record
  for (const item of statusChanges.data) {
    typia.assert(item);
    TestValidator.equals("status change task_id", item.task_id, taskId);
    TestValidator.predicate(
      "status change id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        item.id,
      ),
    );
    TestValidator.predicate(
      "status change new_status_id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        item.new_status_id,
      ),
    );
    TestValidator.predicate(
      "status change changed_at is ISO 8601",
      !isNaN(Date.parse(item.changed_at)),
    );
    // comment can be null or string
    TestValidator.predicate(
      "status change comment check",
      item.comment === null || typeof item.comment === "string",
    );
  }

  // 7. Test error case: invalid taskId
  await TestValidator.error("invalid taskId should throw", async () => {
    await api.functional.taskManagement.developer.tasks.statusChanges.index(
      connection,
      {
        taskId: "invalid-uuid",
        body: requestBody,
      },
    );
  });

  // 8. Test error case: unauthenticated access
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated access should throw", async () => {
    await api.functional.taskManagement.developer.tasks.statusChanges.index(
      unauthConn,
      {
        taskId,
        body: requestBody,
      },
    );
  });
}
