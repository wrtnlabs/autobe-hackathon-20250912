import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowStepExecutionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowStepExecutionLog";
import type { INotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowManager";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageINotificationWorkflowStepExecutionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageINotificationWorkflowStepExecutionLog";

/**
 * This E2E test function validates the successful listing of step execution
 * logs by an authenticated workflowManager user.
 *
 * The test performs the following steps:
 *
 * 1. Creates a new workflowManager user by POST /auth/workflowManager/join.
 * 2. Logs in as the created workflowManager user via POST
 *    /auth/workflowManager/login.
 * 3. Queries step execution logs with various filters and pagination using
 *    PATCH /notificationWorkflow/workflowManager/stepExecutionLogs.
 * 4. Asserts the response structure including pagination metadata and
 *    individual log entries.
 * 5. Validates that all logs have the success flag set to true as filtered.
 *
 * This test ensures proper authentication flow and verifies that the API
 * correctly filters and paginates step execution logs based on the provided
 * criteria.
 */
export async function test_api_stepexecutionlog_list_workflowmanager_success(
  connection: api.IConnection,
) {
  // 1. Create a workflowManager user
  const managerCreateBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(16),
  } satisfies INotificationWorkflowWorkflowManager.ICreate;

  const manager: INotificationWorkflowWorkflowManager.IAuthorized =
    await api.functional.auth.workflowManager.join(connection, {
      body: managerCreateBody,
    });
  typia.assert(manager);

  // 2. Login as the created workflowManager user
  const managerLoginBody = {
    email: managerCreateBody.email,
    password: managerCreateBody.password_hash,
  } satisfies INotificationWorkflowWorkflowManager.ILogin;

  const loggedInManager: INotificationWorkflowWorkflowManager.IAuthorized =
    await api.functional.auth.workflowManager.login(connection, {
      body: managerLoginBody,
    });
  typia.assert(loggedInManager);

  // 3. Prepare a query filter body for step execution logs listing
  const stepExecutionLogRequestBody = {
    workflow_id: typia.random<string & tags.Format<"uuid">>(),
    trigger_id: typia.random<string & tags.Format<"uuid">>(),
    node_id: typia.random<string & tags.Format<"uuid">>(),
    success: true,
    page: 1,
    limit: 10,
    start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date().toISOString(),
  } satisfies INotificationWorkflowStepExecutionLog.IRequest;

  // 4. Query the step execution logs with filtering and pagination
  const pageOfLogs: IPageINotificationWorkflowStepExecutionLog.ISummary =
    await api.functional.notificationWorkflow.workflowManager.stepExecutionLogs.index(
      connection,
      { body: stepExecutionLogRequestBody },
    );

  typia.assert(pageOfLogs);

  // 5. Validate pagination fields
  TestValidator.predicate(
    "pagination current page should be greater than 0",
    pageOfLogs.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    pageOfLogs.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count should be >= 0",
    pageOfLogs.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count should be >= 0",
    pageOfLogs.pagination.pages >= 0,
  );

  // 6. Verify all returned logs have required properties and success flag matches filter
  for (const log of pageOfLogs.data) {
    typia.assert(log);
    TestValidator.equals(
      "each log success flag should be true",
      log.success,
      true,
    );
  }
}
