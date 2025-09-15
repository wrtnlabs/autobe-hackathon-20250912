import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAuditLog";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve a detailed audit log entry by auditLogId for forensic investigation
 * or compliance review.
 *
 * This operation fetches the complete audit log record from the
 * healthcare_platform_audit_logs table identified by its unique auditLogId.
 * Returns comprehensive details including the actor, organization, action type,
 * affected resource/entity, IP address, structured event context, and creation
 * timestamp. Supports compliance, forensic, and security audit workflows. Only
 * accessible to authenticated system administrators.
 *
 * @param props - Request properties for the operation
 * @param props.systemAdmin - The authenticated SystemadminPayload establishing
 *   system-admin privileges
 * @param props.auditLogId - The unique identifier of the audit log record to
 *   retrieve
 * @returns The full audit log record, mapped to IHealthcarePlatformAuditLog
 * @throws {Error} If the audit log entry does not exist
 */
export async function gethealthcarePlatformSystemAdminAuditLogsAuditLogId(props: {
  systemAdmin: SystemadminPayload;
  auditLogId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformAuditLog> {
  const { auditLogId } = props;
  const log =
    await MyGlobal.prisma.healthcare_platform_audit_logs.findUniqueOrThrow({
      where: { id: auditLogId },
    });
  return {
    id: log.id,
    user_id: log.user_id === null ? undefined : log.user_id,
    organization_id:
      log.organization_id === null ? undefined : log.organization_id,
    action_type: log.action_type,
    event_context: log.event_context === null ? undefined : log.event_context,
    ip_address: log.ip_address === null ? undefined : log.ip_address,
    related_entity_type:
      log.related_entity_type === null ? undefined : log.related_entity_type,
    related_entity_id:
      log.related_entity_id === null ? undefined : log.related_entity_id,
    created_at: toISOStringSafe(log.created_at),
  };
}
