import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiAuthAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiAuthAuditLog";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * View full detail for a specific authentication/authorization audit log event
 * (systemAdmin only; storyfield_ai_auth_audit_logs)
 *
 * Retrieves the entire record for a single authentication or authorization
 * audit event from the storyfield_ai_auth_audit_logs table. Intended for deep
 * forensic review, compliance, and investigation by system administrators only.
 * Returns all event context—including actor references, event type, outcome,
 * contextual message, and timestamps—filtered for soft-deleted rows. Throws if
 * not found or admin is not authorized. All date/datetime and uuid fields are
 * returned in strict branded types for API conformance.
 *
 * @param props - Operation props
 * @param props.systemAdmin - The authenticated system administrator payload
 *   (decorator-enforced access control)
 * @param props.authAuditLogId - Unique UUID identifier for the audit log event
 * @returns Full IStoryfieldAiAuthAuditLog object for the requested audit event
 * @throws {Error} If the audit log is not found
 */
export async function getstoryfieldAiSystemAdminAuthAuditLogsAuthAuditLogId(props: {
  systemAdmin: SystemadminPayload;
  authAuditLogId: string & tags.Format<"uuid">;
}): Promise<IStoryfieldAiAuthAuditLog> {
  const { authAuditLogId } = props;
  const log = await MyGlobal.prisma.storyfield_ai_auth_audit_logs.findFirst({
    where: {
      id: authAuditLogId,
    },
  });
  if (!log) throw new Error("Audit log not found");
  return {
    id: log.id,
    token_session_id: log.token_session_id ?? null,
    authenticated_user_id: log.authenticated_user_id ?? null,
    system_admin_id: log.system_admin_id ?? null,
    event_type: log.event_type,
    event_outcome: log.event_outcome,
    event_message: log.event_message ?? null,
    source_ip: log.source_ip ?? null,
    user_agent: log.user_agent ?? null,
    created_at: toISOStringSafe(log.created_at),
  };
}
