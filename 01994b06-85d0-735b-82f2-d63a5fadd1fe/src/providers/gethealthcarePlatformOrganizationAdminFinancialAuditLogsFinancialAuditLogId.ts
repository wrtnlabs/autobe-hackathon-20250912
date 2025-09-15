import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformFinancialAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformFinancialAuditLog";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve a financial audit log entry by ID from
 * healthcare_platform_financial_audit_logs
 *
 * Fetches complete details for a single financial audit log entry given its
 * unique identifier, for compliance and financial event auditing.
 *
 * Only organizationAdmin users assigned to the matching organization may access
 * this endpoint. All returned values are type-safe and comply with API
 * contract.
 *
 * @param props - The input parameter object
 * @param props.organizationAdmin - The authenticated organization admin making
 *   the request
 * @param props.financialAuditLogId - The unique identifier (UUID) for the audit
 *   log entry
 * @returns The full details of the requested financial audit log entry
 * @throws {Error} If not found or if user is not authorized to view the entry
 */
export async function gethealthcarePlatformOrganizationAdminFinancialAuditLogsFinancialAuditLogId(props: {
  organizationAdmin: OrganizationadminPayload;
  financialAuditLogId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformFinancialAuditLog> {
  const { organizationAdmin, financialAuditLogId } = props;

  // Step 1: Lookup financial audit log record by ID only
  const record =
    await MyGlobal.prisma.healthcare_platform_financial_audit_logs.findUnique({
      where: {
        id: financialAuditLogId,
      },
    });
  if (!record) {
    throw new Error("Financial audit log entry not found");
  }

  // Step 2: Ensure the requesting organization admin is assigned to the org associated with this log
  const authorized =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: organizationAdmin.id,
        healthcare_platform_organization_id: record.organization_id,
        assignment_status: "active",
        deleted_at: null,
      },
    });
  if (!authorized) {
    throw new Error(
      "Unauthorized: You are not assigned to this organization or no longer active",
    );
  }

  // Step 3: Strict mapping to DTO, converting Date fields to proper string format
  return {
    id: record.id,
    organization_id: record.organization_id,
    entity_id: record.entity_id === null ? undefined : record.entity_id,
    user_id: record.user_id === null ? undefined : record.user_id,
    entity_type: record.entity_type,
    audit_action: record.audit_action,
    action_description:
      record.action_description === null
        ? undefined
        : record.action_description,
    action_timestamp: toISOStringSafe(record.action_timestamp),
    created_at: toISOStringSafe(record.created_at),
  };
}
