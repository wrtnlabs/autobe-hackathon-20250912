import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { INotificationWorkflowAuditLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowAuditLogs";

export async function test_api_notification_workflow_audit_log_retrieve_by_id(
  connection: api.IConnection,
) {
  // Generate a random uuid for audit log id
  const auditLogId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Call the audit log API to retrieve the audit log by id
  const auditLog: INotificationWorkflowAuditLogs =
    await api.functional.notificationWorkflow.auditLogs.at(connection, {
      id: auditLogId,
    });

  // Validate the response type
  typia.assert(auditLog);

  // Validate audit log fields for expected structure and content
  TestValidator.predicate("audit log has id", auditLog.id === auditLogId);
  TestValidator.predicate(
    "audit log event_type exists",
    typeof auditLog.event_type === "string" && auditLog.event_type.length > 0,
  );
  TestValidator.predicate(
    "audit log event_data exists and is JSON string",
    ((): boolean => {
      try {
        JSON.parse(auditLog.event_data);
        return true;
      } catch {
        return false;
      }
    })(),
  );
  TestValidator.predicate(
    "audit log created_at is string",
    typeof auditLog.created_at === "string" && auditLog.created_at.length > 0,
  );
  // actor_id can be null or string with uuid format
  if (auditLog.actor_id !== null && auditLog.actor_id !== undefined) {
    TestValidator.predicate(
      "actor_id matches uuid format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        auditLog.actor_id,
      ),
    );
  }
}
