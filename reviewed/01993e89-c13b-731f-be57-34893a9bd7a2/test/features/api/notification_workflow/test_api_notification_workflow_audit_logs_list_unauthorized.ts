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
 * Unauthorized access attempt for audit logs retrieval by trigger operator role
 * without authentication. This test tries to call the audit logs endpoint
 * without tokens and expects a failure due to lack of proper auth credentials.
 *
 * This scenario ensures that the endpoint enforces authentication and rejects
 * unauthorized access appropriately.
 *
 * The test flow:
 *
 * 1. Call the join endpoint for trigger operator to verify it works (required
 *    dependency).
 * 2. Attempt to access audit logs endpoint PATCH
 *    /notificationWorkflow/triggerOperator/auditLogs without authentication
 *    headers.
 * 3. Expect and validate an error for unauthorized access (e.g., 401
 *    Unauthorized).
 */
export async function test_api_notification_workflow_audit_logs_list_unauthorized(
  connection: api.IConnection,
) {
  // 1. Join trigger operator (dependency) - not stored as auth for main connection
  const randomCreateBody = {
    email: `${RandomGenerator.name(1).replace(/\s+/g, "").toLowerCase()}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
  } satisfies INotificationWorkflowTriggerOperator.ICreate;

  const authorized =
    await api.functional.auth.triggerOperator.join.joinTriggerOperator(
      connection,
      { body: randomCreateBody },
    );
  typia.assert(authorized);

  // 2. Create an unauthenticated connection with empty headers to simulate no-auth
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 3. Prepare a minimal valid audit logs request body
  const requestBody = {} satisfies INotificationWorkflowAuditLog.IRequest;

  // 4. Attempt to call the audit logs endpoint without authentication
  await TestValidator.error(
    "unauthorized access to audit logs should be rejected",
    async () => {
      await api.functional.notificationWorkflow.triggerOperator.auditLogs.index(
        unauthConn,
        { body: requestBody },
      );
    },
  );
}
