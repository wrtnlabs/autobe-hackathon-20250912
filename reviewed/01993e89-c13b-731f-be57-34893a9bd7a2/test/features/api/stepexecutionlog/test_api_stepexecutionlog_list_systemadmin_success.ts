import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowStepExecutionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowStepExecutionLog";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageINotificationWorkflowStepExecutionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageINotificationWorkflowStepExecutionLog";

/**
 * This E2E test function validates the listing of step execution logs by a
 * systemAdmin user.
 *
 * The test flow is as follows:
 *
 * 1. Create a unique email and password for a systemAdmin user.
 * 2. Register the systemAdmin user using the join endpoint.
 * 3. Log in as the created systemAdmin user to authenticate.
 * 4. Perform a listing request for step execution logs with sample pagination and
 *    filter criteria.
 * 5. Assert that the result is a properly structured paginated response containing
 *    step execution log summaries.
 */
export async function test_api_stepexecutionlog_list_systemadmin_success(
  connection: api.IConnection,
) {
  // 1. Create unique credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);

  // 2. Register systemAdmin user
  const admin: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email,
        password,
      } satisfies INotificationWorkflowSystemAdmin.IRequestJoin,
    });
  typia.assert(admin);

  // 3. Login as the created systemAdmin user
  const loggedIn: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: {
        email,
        password,
      } satisfies INotificationWorkflowSystemAdmin.IRequestLogin,
    });
  typia.assert(loggedIn);

  // 4. Perform step execution logs listing with valid request
  const listRequest: INotificationWorkflowStepExecutionLog.IRequest = {
    page: 1,
    limit: 10,
    workflow_id: null,
    trigger_id: null,
    node_id: null,
    success: null,
    start_date: null,
    end_date: null,
  };

  const result: IPageINotificationWorkflowStepExecutionLog.ISummary =
    await api.functional.notificationWorkflow.systemAdmin.stepExecutionLogs.index(
      connection,
      { body: listRequest },
    );
  typia.assert(result);
  TestValidator.predicate(
    "pagination current page is valid",
    result.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    result.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    result.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate("data is an array", Array.isArray(result.data));
  for (const item of result.data) {
    typia.assert(item);
    TestValidator.predicate(
      "step execution log id is valid uuid",
      typeof item.id === "string" && item.id.length === 36,
    );
    TestValidator.predicate(
      "workflow_id valid",
      typeof item.workflow_id === "string" && item.workflow_id.length === 36,
    );
    TestValidator.predicate(
      "trigger_id valid",
      typeof item.trigger_id === "string" && item.trigger_id.length === 36,
    );
    TestValidator.predicate(
      "node_id valid",
      typeof item.node_id === "string" && item.node_id.length === 36,
    );
    TestValidator.predicate(
      "attempt is integer",
      Number.isInteger(item.attempt) && item.attempt >= 0,
    );
    TestValidator.predicate(
      "started_at is valid iso date-time",
      typeof item.started_at === "string" &&
        !isNaN(Date.parse(item.started_at)),
    );
    TestValidator.predicate(
      "finished_at is valid iso date-time",
      typeof item.finished_at === "string" &&
        !isNaN(Date.parse(item.finished_at)),
    );
    TestValidator.predicate(
      "success is boolean",
      typeof item.success === "boolean",
    );
  }
}
