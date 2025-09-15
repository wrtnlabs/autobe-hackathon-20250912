import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowStepExecutionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowStepExecutionLog";
import type { INotificationWorkflowTriggerOperator } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowTriggerOperator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageINotificationWorkflowStepExecutionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageINotificationWorkflowStepExecutionLog";

/**
 * This E2E test validates that the process of creating a triggerOperator user,
 * logging in, and then successfully listing step execution logs works correctly
 * with proper authorization and pagination/filtering parameters. The test
 * covers the entire workflow from user creation to token acquisition and
 * usage.
 *
 * Steps:
 *
 * 1. Create (join) a triggerOperator user
 * 2. Login as the created user to obtain authentication tokens
 * 3. Perform a paged and filtered listing of step execution logs
 * 4. Validate the response including pagination metadata and log summary data
 */
export async function test_api_stepexecutionlog_list_triggeroperator_success(
  connection: api.IConnection,
) {
  // 1. Create a triggerOperator user
  const triggerOperatorCreateBody = {
    email: `trigger.operator.${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
  } satisfies INotificationWorkflowTriggerOperator.ICreate;
  const triggerOperator: INotificationWorkflowTriggerOperator.IAuthorized =
    await api.functional.auth.triggerOperator.join.joinTriggerOperator(
      connection,
      {
        body: triggerOperatorCreateBody,
      },
    );
  typia.assert(triggerOperator);

  // 2. Login as the triggerOperator to obtain fresh tokens
  const triggerOperatorLoginBody = {
    email: triggerOperator.email,
    password_hash: triggerOperatorCreateBody.password_hash,
  } satisfies INotificationWorkflowTriggerOperator.ILogin;
  const loggedInTriggerOperator: INotificationWorkflowTriggerOperator.IAuthorized =
    await api.functional.auth.triggerOperator.login.loginTriggerOperator(
      connection,
      {
        body: triggerOperatorLoginBody,
      },
    );
  typia.assert(loggedInTriggerOperator);

  // 3. Request to list step execution logs with pagination and optional filters
  // Use realistic values for pagination and some filters
  const stepExecutionLogRequestBody = {
    page: 1,
    limit: 10,
    success: true,
    start_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // from 24h ago
    end_date: new Date().toISOString(), // until now
  } satisfies INotificationWorkflowStepExecutionLog.IRequest;

  const stepExecutionLogsPage: IPageINotificationWorkflowStepExecutionLog.ISummary =
    await api.functional.notificationWorkflow.triggerOperator.stepExecutionLogs.index(
      connection,
      {
        body: stepExecutionLogRequestBody,
      },
    );
  typia.assert(stepExecutionLogsPage);

  // 4. Validate the pagination info and data array
  TestValidator.predicate(
    "pagination current page is 1",
    stepExecutionLogsPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    stepExecutionLogsPage.pagination.limit === 10,
  );
  TestValidator.predicate(
    "data is an array",
    Array.isArray(stepExecutionLogsPage.data),
  );

  // If data exists, validate each summary log's required fields
  if (stepExecutionLogsPage.data.length > 0) {
    for (const logSummary of stepExecutionLogsPage.data) {
      typia.assert(logSummary);
      TestValidator.predicate(
        "log summary id is string and uuid",
        typeof logSummary.id ===
          "string" /* UUID format already asserted by typia.assert */,
      );
      TestValidator.predicate(
        "log summary success is boolean",
        typeof logSummary.success === "boolean",
      );
    }
  }
}
