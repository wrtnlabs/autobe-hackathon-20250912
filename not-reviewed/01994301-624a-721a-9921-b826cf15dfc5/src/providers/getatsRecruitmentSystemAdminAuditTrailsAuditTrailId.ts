import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentAuditTrail } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentAuditTrail";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve a single audit trail record by its ID from
 * ats_recruitment_audit_trails.
 *
 * Retrieves an audit trail entry including event metadata, actor, operation,
 * and detailed context for compliance and forensics. Only system administrators
 * are permitted to access this endpoint. Returns all fields mapped exactly as
 * in the IAtsRecruitmentAuditTrail.
 *
 * @param props - Properties for audit log read operation.
 * @param props.systemAdmin - Authenticated system administrator payload
 *   (required; access controlled).
 * @param props.auditTrailId - The UUID of the audit trail event to retrieve.
 * @returns The detailed audit trail entry corresponding to the specified
 *   auditTrailId.
 * @throws {Error} If the record is not found or access is denied.
 */
export async function getatsRecruitmentSystemAdminAuditTrailsAuditTrailId(props: {
  systemAdmin: SystemadminPayload;
  auditTrailId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentAuditTrail> {
  const { auditTrailId } = props;
  const audit = await MyGlobal.prisma.ats_recruitment_audit_trails.findFirst({
    where: { id: auditTrailId },
  });
  if (audit === null) {
    throw new Error("Audit trail record not found");
  }
  return {
    id: audit.id,
    event_timestamp: toISOStringSafe(audit.event_timestamp),
    actor_id: audit.actor_id,
    actor_role: audit.actor_role,
    operation_type: audit.operation_type,
    target_type: audit.target_type,
    target_id: audit.target_id ?? undefined,
    event_detail: audit.event_detail,
    ip_address: audit.ip_address ?? undefined,
    user_agent: audit.user_agent ?? undefined,
    created_at: toISOStringSafe(audit.created_at),
    updated_at: toISOStringSafe(audit.updated_at),
    deleted_at: audit.deleted_at
      ? toISOStringSafe(audit.deleted_at)
      : undefined,
  };
}
