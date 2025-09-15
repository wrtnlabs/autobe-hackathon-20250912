import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTaskStatusChange";
import type { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";
import type { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";

/**
 * This end-to-end test function verifies the capability of a QA user to
 * retrieve a paginated and filtered list of task status changes for a given
 * task.
 *
 * The business context is that a QA user must be able to track task state
 * transitions via API calls, requiring valid authentication and correct
 * request input.
 *
 * The workflow proceeds as follows:
 *
 * 1. Create and authenticate a QA user via /auth/qa/join API.
 * 2. Generate a valid UUID for a task ID to query.
 * 3. Construct a request body utilizing the
 *    ITaskManagementTaskStatusChange.IRequest type which may include
 *    pagination parameters page and limit.
 * 4. Invoke the PATCH /taskManagement/qa/tasks/{taskId}/statusChanges endpoint
 *    with the taskId path parameter and the constructed request body.
 * 5. Assert the paginated response structure including pagination info and
 *    data entries.
 * 6. Each entry in the data array is validated against
 *    ITaskManagementTaskStatusChange schema.
 * 7. Validate robust error handling and authorization enforcement, but no
 *    invalid type testing is included.
 */
export async function test_api_task_status_changes_refresh_list_qa_role(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a QA user
  const qaUserBody = {
    email: RandomGenerator.alphaNumeric(6) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementQa.ICreate;

  const qaUser: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.join(connection, { body: qaUserBody });
  typia.assert(qaUser);

  // 2. Generate a valid UUID for taskId
  const taskId = typia.random<string & tags.Format<"uuid">>();

  // 3. Construct the request body for status changes retrieval (pagination only)
  const requestBody = {
    page: 1,
    limit: 10,
  } satisfies ITaskManagementTaskStatusChange.IRequest;

  // 4. Call the PATCH task status changes endpoint
  const response: IPageITaskManagementTaskStatusChange =
    await api.functional.taskManagement.qa.tasks.statusChanges.index(
      connection,
      {
        taskId: taskId,
        body: requestBody,
      },
    );

  // 5. Validate the response structure
  typia.assert(response);

  // 6. Validate pagination info
  TestValidator.predicate(
    "pagination current page is at least 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is not negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is at least 0",
    response.pagination.pages >= 0,
  );

  // 7. Validate each data entry
  for (const entry of response.data) {
    typia.assert(entry);
    TestValidator.predicate(
      "task status change entry task_id matches query taskId",
      entry.task_id === taskId,
    );
  }
}
