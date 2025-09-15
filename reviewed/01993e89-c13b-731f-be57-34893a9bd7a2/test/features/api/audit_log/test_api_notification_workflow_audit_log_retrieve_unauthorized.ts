import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { INotificationWorkflowAuditLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowAuditLogs";

/**
 * Test for unauthorized access when retrieving a notification workflow
 * audit log entry by ID.
 *
 * This test verifies that attempting to retrieve an audit log without
 * proper authentication results in a failure, enforcing role-based access
 * control and denying unauthorized access.
 *
 * Steps:
 *
 * 1. Use a connection without authentication tokens or credentials.
 * 2. Attempt to retrieve a notification workflow audit log by a random valid
 *    UUID.
 * 3. Confirm that the API call throws an error indicating unauthorized access.
 */
export async function test_api_notification_workflow_audit_log_retrieve_unauthorized(
  connection: api.IConnection,
) {
  // 1. Prepare an unauthenticated connection (assumed from provided connection)

  // 2. Generate a random UUID for the audit log ID
  const auditLogId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Attempt to retrieve the audit log without authentication and expect failure
  await TestValidator.error(
    "unauthorized access to audit log should fail",
    async () => {
      await api.functional.notificationWorkflow.auditLogs.at(connection, {
        id: auditLogId,
      });
    },
  );
}
