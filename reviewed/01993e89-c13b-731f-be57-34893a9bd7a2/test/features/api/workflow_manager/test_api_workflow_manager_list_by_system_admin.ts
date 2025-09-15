import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";
import type { INotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowManager";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageINotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageINotificationWorkflowWorkflowManager";

/**
 * Validates that a system administrator can successfully retrieve a
 * paginated list of workflow manager users by applying search filters and
 * pagination parameters.
 *
 * This E2E test performs the following:
 *
 * 1. Registers a new system administrator user by calling the join API.
 * 2. Logs in the system administrator to authenticate and establish session.
 * 3. Calls the PATCH endpoint to list workflow managers with search and
 *    pagination parameters.
 * 4. Validates the response structure, including pagination info and data
 *    list.
 * 5. Ensures each workflow manager summary includes a valid UUID id and
 *    properly formatted email.
 *
 * This test confirms the main workflow for system admin role to access and
 * filter workflow managers in a paginated way, ensuring proper
 * authorization and API response integrity.
 */
export async function test_api_workflow_manager_list_by_system_admin(
  connection: api.IConnection,
) {
  // Step 1: Register system administrator (join) to create admin user and get token
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies INotificationWorkflowSystemAdmin.IRequestJoin;

  const adminAuthorized: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Step 2: Login as system administrator to authenticate and set authorization token
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
  } satisfies INotificationWorkflowSystemAdmin.IRequestLogin;

  const loginAuthorized: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(loginAuthorized);

  // Step 3: Prepare workflow manager search request with pagination and filters
  const requestBody = {
    page: 1,
    limit: 10,
    search: RandomGenerator.alphaNumeric(5),
    sortBy: "email",
  } satisfies INotificationWorkflowWorkflowManager.IRequest;

  // Step 4: Call the list workflow managers endpoint
  const workflowManagersPage: IPageINotificationWorkflowWorkflowManager.ISummary =
    await api.functional.notificationWorkflow.systemAdmin.workflowManagers.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(workflowManagersPage);

  // Step 5: Validate pagination information is valid
  TestValidator.predicate(
    "workflow manager list pagination current should be >= 0",
    workflowManagersPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "workflow manager list pagination limit should be >= 0",
    workflowManagersPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "workflow manager list pagination records should be >= 0",
    workflowManagersPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "workflow manager list pagination pages should be >= 0",
    workflowManagersPage.pagination.pages >= 0,
  );

  // Step 6: Validate each workflow manager summary in the data array
  for (const manager of workflowManagersPage.data) {
    TestValidator.predicate(
      "workflow manager summary id should be a valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        manager.id,
      ),
    );
    TestValidator.predicate(
      "workflow manager summary email should be a valid email format",
      /^[\w.-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(manager.email),
    );
  }
}
