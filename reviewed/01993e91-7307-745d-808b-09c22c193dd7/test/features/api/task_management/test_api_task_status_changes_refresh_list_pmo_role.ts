import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTaskStatusChange";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";

export async function test_api_task_status_changes_refresh_list_pmo_role(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate PMO user
  const pmoJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;

  const authorized: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, {
      body: pmoJoinBody,
    });
  typia.assert(authorized);

  // Step 2: Prepare task ID for querying status changes
  // Use a valid but random UUID since no creation API is available here
  const taskId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 3: Prepare filter and pagination request
  const filterRequest = {
    task_id: taskId,
    page: 1,
    limit: 10,
  } satisfies ITaskManagementTaskStatusChange.IRequest;

  // Step 4: Call the API endpoint to retrieve status changes
  const response: IPageITaskManagementTaskStatusChange =
    await api.functional.taskManagement.pmo.tasks.statusChanges.index(
      connection,
      {
        taskId: taskId,
        body: filterRequest,
      },
    );
  typia.assert(response);

  // Step 5: Validate pagination info
  TestValidator.predicate(
    "pagination current is positive (>= 1)",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive (> 0)",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );

  // Step 6: Validate each status change record
  for (const change of response.data) {
    typia.assert<ITaskManagementTaskStatusChange>(change);
    TestValidator.equals("taskId matches filter", change.task_id, taskId);
    TestValidator.predicate(
      "new_status_id is non-empty string",
      typeof change.new_status_id === "string" &&
        change.new_status_id.length > 0,
    );
    TestValidator.predicate(
      "changed_at is a non-empty date-time string",
      typeof change.changed_at === "string" && change.changed_at.length > 0,
    );
    // comment is optional string or null, if present no error
  }
}
