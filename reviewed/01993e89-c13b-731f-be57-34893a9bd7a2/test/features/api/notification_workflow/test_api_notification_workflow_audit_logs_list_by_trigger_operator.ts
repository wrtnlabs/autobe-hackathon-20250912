import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowAuditLog";
import type { INotificationWorkflowTriggerOperator } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowTriggerOperator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageINotificationWorkflowAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageINotificationWorkflowAuditLog";

/**
 * Validate that a trigger operator can register, authenticate, and retrieve a
 * paginated list of notification workflow audit logs filtered by event type.
 *
 * The test performs the following steps:
 *
 * 1. Register a new trigger operator user with unique email and password hash.
 * 2. Confirm the returned authorization info and token assignment in connection.
 * 3. Invoke the audit logs listing API with pagination and event type filter.
 * 4. Validate the returned paginated audit log list against expected structure.
 */
export async function test_api_notification_workflow_audit_logs_list_by_trigger_operator(
  connection: api.IConnection,
) {
  // 1. Register a trigger operator
  const triggerOperatorCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(64),
  } satisfies INotificationWorkflowTriggerOperator.ICreate;

  const authorized: INotificationWorkflowTriggerOperator.IAuthorized =
    await api.functional.auth.triggerOperator.join.joinTriggerOperator(
      connection,
      { body: triggerOperatorCreate },
    );
  typia.assert(authorized);

  // 2. Prepare audit log request body
  const requestBody = {
    page: 1,
    limit: 10,
    event_type: RandomGenerator.name(1),
    created_after: new Date(Date.now() - 1000 * 3600 * 24).toISOString(),
    created_before: new Date(Date.now() + 1000 * 3600 * 24).toISOString(),
  } satisfies INotificationWorkflowAuditLog.IRequest;

  // 3. Fetch the audit logs via PATCH /notificationWorkflow/triggerOperator/auditLogs
  const result: IPageINotificationWorkflowAuditLog.ISummary =
    await api.functional.notificationWorkflow.triggerOperator.auditLogs.index(
      connection,
      { body: requestBody },
    );
  typia.assert(result);

  // 4. Basic validation of returned pagination and data
  TestValidator.predicate(
    "pagination current page is 1",
    result.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    result.pagination.limit === 10,
  );
  TestValidator.predicate("data array exists", Array.isArray(result.data));
  for (const summary of result.data) {
    typia.assert(summary);
    TestValidator.predicate(
      "event_type is a non-empty string",
      typeof summary.event_type === "string" && summary.event_type.length > 0,
    );
  }
}
