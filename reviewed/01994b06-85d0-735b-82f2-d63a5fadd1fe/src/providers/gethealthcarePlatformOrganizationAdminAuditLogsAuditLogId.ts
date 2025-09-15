import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAuditLog";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve a detailed audit log entry by auditLogId for forensic investigation
 * or compliance review.
 *
 * This function fetches a single audit log entry by its unique ID from the
 * healthcare_platform_audit_logs table, enforcing organizational isolation so
 * that only administrators of the matching organization can retrieve the log.
 * All event context fields are mapped with proper type handling and optionals,
 * and the created_at timestamp is always formatted as an ISO8601 string with
 * branding. Throws errors if the record is not found or access is forbidden.
 *
 * @param props - The request object containing:
 *
 *   - OrganizationAdmin: Authenticated organization admin payload
 *   - AuditLogId: The unique log ID to retrieve
 *
 * @returns The detailed audit log record in DTO form
 * @throws {Error} If the audit log entry does not exist or is outside the
 *   admin's organization scope
 */
export async function gethealthcarePlatformOrganizationAdminAuditLogsAuditLogId(props: {
  organizationAdmin: OrganizationadminPayload;
  auditLogId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformAuditLog> {
  const { organizationAdmin, auditLogId } = props;
  // 1. Retrieve the audit log by its primary key
  const log = await MyGlobal.prisma.healthcare_platform_audit_logs.findUnique({
    where: { id: auditLogId },
  });
  if (!log) throw new Error("Audit log entry not found");

  // 2. Organization-scoped access check
  if (log.organization_id && log.organization_id !== organizationAdmin.id) {
    throw new Error("Forbidden: Cannot access logs for another organization");
  }

  // 3. Map all fields explicitly, converting options/nullable as per API DTO
  return {
    id: log.id,
    user_id: log.user_id ?? undefined,
    organization_id: log.organization_id ?? undefined,
    action_type: log.action_type,
    event_context: log.event_context ?? undefined,
    ip_address: log.ip_address ?? undefined,
    related_entity_type: log.related_entity_type ?? undefined,
    related_entity_id: log.related_entity_id ?? undefined,
    created_at: toISOStringSafe(log.created_at),
  };
}
