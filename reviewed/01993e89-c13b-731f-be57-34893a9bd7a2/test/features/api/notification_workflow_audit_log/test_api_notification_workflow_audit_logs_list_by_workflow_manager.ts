import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowAuditLog";
import type { INotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowManager";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageINotificationWorkflowAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageINotificationWorkflowAuditLog";

/**
 * Validates the notification workflow audit logs listing functionality by a
 * workflow manager user.
 *
 * This test simulates the following steps:
 *
 * 1. Create and authenticate a workflowManager user via the
 *    /auth/workflowManager/join endpoint.
 * 2. Perform a PATCH request to
 *    /notificationWorkflow/workflowManager/auditLogs with filtering and
 *    pagination parameters.
 * 3. Validate that the response is a structured paginated audit log listing.
 *
 * The test verifies that authentication tokens are set, filtering
 * parameters are accepted, pagination metadata is correct, and audit logs
 * returned match filtering constraints. It also ensures type correctness
 * and runtime validation by using typia.assert.
 */
export async function test_api_notification_workflow_audit_logs_list_by_workflow_manager(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate workflowManager user
  const workflowManagerCreateBody = {
    email: `${RandomGenerator.name(1).replace(/\s+/g, "").toLowerCase()}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies INotificationWorkflowWorkflowManager.ICreate;

  const authorizedUser: INotificationWorkflowWorkflowManager.IAuthorized =
    await api.functional.auth.workflowManager.join(connection, {
      body: workflowManagerCreateBody,
    });
  typia.assert(authorizedUser);

  // Step 2: Prepare audit log filter request with pagination and date filtering
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const auditLogRequestBody = {
    page: 1,
    limit: 10,
    event_type: null,
    actor_id: null,
    created_after: sevenDaysAgo.toISOString(),
    created_before: now.toISOString(),
  } satisfies INotificationWorkflowAuditLog.IRequest;

  // Step 3: Fetch audit logs using PATCH `/notificationWorkflow/workflowManager/auditLogs`
  const auditLogPage: IPageINotificationWorkflowAuditLog.ISummary =
    await api.functional.notificationWorkflow.workflowManager.auditLogs.index(
      connection,
      {
        body: auditLogRequestBody,
      },
    );
  typia.assert(auditLogPage);

  // Step 4: Validate pagination metadata correctness
  const { pagination, data } = auditLogPage;
  TestValidator.predicate(
    "pagination current page is 1",
    pagination.current === 1,
  );
  TestValidator.predicate("pagination limit is 10", pagination.limit === 10);
  TestValidator.predicate(
    "pagination records non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    pagination.pages >= 0,
  );
  TestValidator.predicate("data array is defined", Array.isArray(data));

  // Step 5: Check each audit log entry properties and types
  data.forEach((log, index) => {
    typia.assert(log);
    TestValidator.predicate(
      `auditLog[${index}].id is uuid format`,
      typeof log.id === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          log.id,
        ),
    );
    if (log.actor_id !== null && log.actor_id !== undefined) {
      TestValidator.predicate(
        `auditLog[${index}].actor_id is uuid format or null`,
        typeof log.actor_id === "string" &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            log.actor_id,
          ),
      );
    } else {
      TestValidator.equals(
        `auditLog[${index}].actor_id is null`,
        log.actor_id,
        null,
      );
    }
    TestValidator.predicate(
      `auditLog[${index}].event_type is non-empty string`,
      typeof log.event_type === "string" && log.event_type.length > 0,
    );
    TestValidator.predicate(
      `auditLog[${index}].event_data is string`,
      typeof log.event_data === "string",
    );
    TestValidator.predicate(
      `auditLog[${index}].created_at is date-time format string`,
      typeof log.created_at === "string" && !isNaN(Date.parse(log.created_at)),
    );
  });
}
