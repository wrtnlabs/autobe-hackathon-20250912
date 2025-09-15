import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowManager";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageINotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageINotificationWorkflowWorkflowManager";

/**
 * Test successful retrieval of a paginated list of workflow manager users by an
 * authenticated workflowManager user.
 *
 * This test covers:
 *
 * 1. Creating a workflowManager user to authenticate and obtain JWT tokens.
 * 2. Using the authenticated context to call the paginated workflow managers
 *    listing API.
 * 3. Requesting the list with pagination and a search filter string.
 * 4. Validating the response pagination fields and data contents.
 * 5. Verifying that the returned workflow manager summaries have valid UUIDs and
 *    emails.
 */
export async function test_api_workflow_manager_list_workflow_managers_success(
  connection: api.IConnection,
) {
  // 1. Create a new workflowManager user to authenticate
  const email = `${RandomGenerator.alphabets(5)}@example.com`;
  const password_hash = RandomGenerator.alphabets(16);

  const authorized: INotificationWorkflowWorkflowManager.IAuthorized =
    await api.functional.auth.workflowManager.join(connection, {
      body: {
        email: email,
        password_hash: password_hash,
      } satisfies INotificationWorkflowWorkflowManager.ICreate,
    });
  typia.assert(authorized);

  // 2. Prepare request body with search, page, limit for paginated listing
  const searchString = RandomGenerator.substring(email);
  const requestBody = {
    page: 1,
    limit: 10,
    search: searchString,
    sortBy: null,
  } satisfies INotificationWorkflowWorkflowManager.IRequest;

  // 3. Call the API to list workflow managers with the search and pagination params
  const response: IPageINotificationWorkflowWorkflowManager.ISummary =
    await api.functional.notificationWorkflow.workflowManager.workflowManagers.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(response);

  // 4. Validate pagination numbers and data list
  TestValidator.predicate(
    "valid current page",
    response.pagination.current === 1,
  );
  TestValidator.predicate("limit is 10", response.pagination.limit === 10);
  TestValidator.predicate(
    "records count non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages valid",
    response.pagination.pages >= 0 &&
      (response.pagination.pages === 0 || response.pagination.pages >= 1),
  );

  TestValidator.predicate("data is array", Array.isArray(response.data));

  // 5. Validate each workflow manager summary's id as UUID and email as string
  for (const manager of response.data) {
    TestValidator.predicate(
      "manager id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        manager.id,
      ),
    );
    TestValidator.predicate(
      "manager email is non-empty string",
      typeof manager.email === "string" && manager.email.length > 0,
    );
  }
}
