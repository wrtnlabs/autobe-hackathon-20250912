import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowAuditLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowAuditLogs";

/**
 * Retrieve a specific notification workflow audit log entry by its unique ID.
 *
 * This operation fetches detailed immutable audit log information that is
 * typically used for compliance, troubleshooting, or forensic analysis.
 *
 * @param props - Object containing the unique identifier of the audit log
 *   entry.
 * @param props.id - The UUID of the audit log to retrieve.
 * @returns The detailed audit log entry with event type, event data (JSON
 *   string), creation timestamp, and optional actor ID.
 * @throws {Error} Throws if the audit log with the specified ID does not exist.
 */
export async function getnotificationWorkflowAuditLogsId(props: {
  id: string & tags.Format<"uuid">;
}): Promise<INotificationWorkflowAuditLogs> {
  const { id } = props;

  const record =
    await MyGlobal.prisma.notification_workflow_audit_logs.findUniqueOrThrow({
      where: { id },
    });

  return {
    id: record.id,
    actor_id: record.actor_id === null ? null : (record.actor_id ?? undefined),
    event_type: record.event_type,
    event_data: record.event_data,
    created_at: toISOStringSafe(record.created_at),
  };
}
