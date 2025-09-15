import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { INotificationWorkflowAuditLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowAuditLogs";

/**
 * Test retrieving a non-existent notification workflow audit log by ID.
 *
 * This test attempts to retrieve an audit log with a UUID that does not
 * exist in the system, expecting an error response indicating the resource
 * was not found. The API call uses a randomly generated UUID to ensure it
 * doesn't exist.
 *
 * It validates that the system correctly handles the attempt and throws an
 * HttpError, verifying proper error handling for missing resources.
 *
 * No dependencies are needed as this tests negative retrieval.
 */
export async function test_api_notification_workflow_audit_log_retrieve_not_found(
  connection: api.IConnection,
) {
  // Generate a random UUID that does not exist
  const nonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Attempt retrieval and expect error due to not found
  await TestValidator.error(
    "retrieving non-existent audit log should fail with not-found error",
    async () => {
      await api.functional.notificationWorkflow.auditLogs.at(connection, {
        id: nonExistentId,
      });
    },
  );
}
