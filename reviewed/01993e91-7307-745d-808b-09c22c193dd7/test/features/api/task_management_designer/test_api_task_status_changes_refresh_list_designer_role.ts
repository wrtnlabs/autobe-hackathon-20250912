import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTaskStatusChange";
import type { ITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDesigner";
import type { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";

/**
 * Verify the Designer role can register and authenticate, then retrieve a
 * filtered and paginated list of task status changes for a specific task.
 *
 * This test covers successful scenarios where a Designer user is created and
 * authenticated, followed by a request to obtain task status changes with
 * proper pagination. It also tests invalid input and unauthorized access error
 * handling.
 */
export async function test_api_task_status_changes_refresh_list_designer_role(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate the Designer user
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(64),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementDesigner.ICreate;
  const authorized: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.join(connection, {
      body: createBody,
    });
  typia.assert(authorized);

  // Step 2: Prepare a valid UUID for taskId
  const taskId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Request task status changes with pagination
  const requestBody = {
    task_id: taskId,
    page: 1,
    limit: 10,
  } satisfies ITaskManagementTaskStatusChange.IRequest;

  const response: IPageITaskManagementTaskStatusChange =
    await api.functional.taskManagement.designer.tasks.statusChanges.index(
      connection,
      {
        taskId: taskId,
        body: requestBody,
      },
    );
  typia.assert(response);

  // Step 4: Verify pagination properties
  const pagination = response.pagination;
  TestValidator.predicate(
    "pagination.current is positive",
    pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination.limit is between 1 and 50",
    pagination.limit >= 1 && pagination.limit <= 50,
  );
  TestValidator.predicate(
    "pagination.records is zero or positive",
    pagination.records >= 0,
  );
  TestValidator.predicate("pagination.pages is positive", pagination.pages > 0);

  // Step 5: Validate each status change belongs to the requested task
  for (const statusChange of response.data) {
    typia.assert(statusChange);
    TestValidator.equals("task_id matches", statusChange.task_id, taskId);
  }

  // Step 6: Test error with invalid taskId
  await TestValidator.error(
    "should throw error for invalid taskId format",
    async () => {
      await api.functional.taskManagement.designer.tasks.statusChanges.index(
        connection,
        {
          taskId: "invalid-uuid" as string & tags.Format<"uuid">,
          body: {
            page: 1,
            limit: 10,
          },
        },
      );
    },
  );

  // Step 7: Test unauthorized access without authentication
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "should throw unauthorized error if not authenticated",
    async () => {
      await api.functional.taskManagement.designer.tasks.statusChanges.index(
        unauthenticatedConnection,
        {
          taskId: taskId,
          body: {
            page: 1,
            limit: 10,
          },
        },
      );
    },
  );
}
