import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformFinancialAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformFinancialAuditLog";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve a financial audit log entry by ID from
 * healthcare_platform_financial_audit_logs.
 *
 * Fetches the complete details of a specific financial audit log record for
 * regulatory, compliance, or financial investigation purposes. Only system
 * admins may access this endpoint; all access is audited. The returned audit
 * log includes detailed event-level provenance for HIPAA/SOC2 compliance,
 * referencing the responsible user, associated organization and entity, event
 * action details, and human-readable context.
 *
 * @param props - Function arguments
 * @param props.systemAdmin - The authenticated system administrator making the
 *   request
 * @param props.financialAuditLogId - Unique identifier of the audit log entry
 *   to retrieve
 * @returns Financial audit log record with all principal event details
 * @throws {Error} When the audit log does not exist for the given ID (Prisma
 *   will throw automatically)
 */
export async function gethealthcarePlatformSystemAdminFinancialAuditLogsFinancialAuditLogId(props: {
  systemAdmin: SystemadminPayload;
  financialAuditLogId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformFinancialAuditLog> {
  const { financialAuditLogId } = props;

  const row =
    await MyGlobal.prisma.healthcare_platform_financial_audit_logs.findUniqueOrThrow(
      {
        where: { id: financialAuditLogId },
        select: {
          id: true,
          organization_id: true,
          entity_id: true,
          user_id: true,
          entity_type: true,
          audit_action: true,
          action_description: true,
          action_timestamp: true,
          created_at: true,
        },
      },
    );

  return {
    id: row.id,
    organization_id: row.organization_id,
    entity_id: row.entity_id ?? undefined,
    user_id: row.user_id ?? undefined,
    entity_type: row.entity_type,
    audit_action: row.audit_action,
    action_description: row.action_description ?? undefined,
    action_timestamp: toISOStringSafe(row.action_timestamp),
    created_at: toISOStringSafe(row.created_at),
  };
}
