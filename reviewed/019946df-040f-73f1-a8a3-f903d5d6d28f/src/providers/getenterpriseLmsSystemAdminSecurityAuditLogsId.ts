import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsSecurityAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSecurityAuditLog";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve a single security audit log by its unique ID.
 *
 * This operation returns the full details of a security audit log record,
 * including tenant and user identifiers, action performed, optional
 * description, and the timestamp of the event.
 *
 * Access is restricted to authenticated system administrators.
 *
 * @param props - An object containing the authenticated system admin and the ID
 *   of the audit log to retrieve.
 * @param props.systemAdmin - The authenticated system administrator payload.
 * @param props.id - The UUID of the security audit log record.
 * @returns The detailed security audit log record matching the given ID.
 * @throws {Error} Throws if no audit log with the given ID exists.
 */
export async function getenterpriseLmsSystemAdminSecurityAuditLogsId(props: {
  systemAdmin: SystemadminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsSecurityAuditLog> {
  const { systemAdmin, id } = props;

  const record =
    await MyGlobal.prisma.enterprise_lms_security_audit_logs.findUniqueOrThrow({
      where: { id },
    });

  return {
    id: record.id,
    enterprise_lms_tenant_id: record.enterprise_lms_tenant_id ?? null,
    action: record.action,
    description: record.description ?? null,
    user_id: record.user_id ?? null,
    created_at: toISOStringSafe(record.created_at),
  };
}
