import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAuditLog";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve detailed information of a single audit log entry by ID.
 *
 * This operation fetches an audit log entry from the enterprise_lms_audit_logs
 * table, returning complete metadata including tenant association, performed
 * action, description, user responsible, and creation timestamp.
 *
 * Only authorized system administrators are allowed to execute this operation.
 *
 * @param props - Object containing systemAdmin authentication and audit log ID
 * @param props.systemAdmin - Authenticated system administrator payload
 * @param props.id - UUID of the audit log entry to retrieve
 * @returns Detailed audit log entry conforming to IEnterpriseLmsAuditLog
 * @throws {Error} If no audit log entry matches the given ID
 */
export async function getenterpriseLmsSystemAdminAuditLogsId(props: {
  systemAdmin: SystemadminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsAuditLog> {
  const { systemAdmin, id } = props;

  const record =
    await MyGlobal.prisma.enterprise_lms_audit_logs.findUniqueOrThrow({
      where: { id },
    });

  return {
    id: record.id as string & tags.Format<"uuid">,
    enterprise_lms_tenant_id: record.enterprise_lms_tenant_id ?? null,
    action: record.action,
    description: record.description ?? null,
    user_id: record.user_id ?? null,
    created_at: toISOStringSafe(record.created_at),
  };
}
