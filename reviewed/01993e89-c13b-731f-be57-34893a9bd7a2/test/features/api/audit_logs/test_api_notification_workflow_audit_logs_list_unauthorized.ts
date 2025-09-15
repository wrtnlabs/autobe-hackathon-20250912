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
 * Validate that unauthorized access to notification workflow audit logs is
 * rejected.
 *
 * This test performs the prerequisite join operation to create a
 * workflowManager user, then tries to fetch audit logs without
 * authentication token, expecting an authorization error. It ensures that
 * audit logs endpoint enforces security properly preventing unauthorized
 * data access.
 *
 * Steps:
 *
 * 1. Join a workflowManager user to fulfill role setup.
 * 2. Attempt to list audit logs without any authentication token.
 * 3. Verify that the call fails with an authorization error.
 */
export async function test_api_notification_workflow_audit_logs_list_unauthorized(
  connection: api.IConnection,
) {
  // 1. Join workflowManager user
  const joinPayload = {
    email: RandomGenerator.alphaNumeric(12) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies INotificationWorkflowWorkflowManager.ICreate;

  await api.functional.auth.workflowManager.join(connection, {
    body: joinPayload,
  });

  // 2. Prepare a connection without any authentication headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 3. Prepare a request body with all optional filters set explicitly with null
  const requestBody = {
    page: 1,
    limit: 10,
    actor_id: null,
    event_type: null,
    created_after: null,
    created_before: null,
  } satisfies INotificationWorkflowAuditLog.IRequest;

  // 4. Attempt audit logs fetch without authentication, expect authorization error
  await TestValidator.error(
    "Unauthorized access to audit logs should be rejected",
    async () => {
      await api.functional.notificationWorkflow.workflowManager.auditLogs.index(
        unauthConn,
        { body: requestBody },
      );
    },
  );
}
