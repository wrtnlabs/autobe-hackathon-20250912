import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAuditLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get a single audit log entry by its unique ID.
 *
 * This operation retrieves detailed immutable audit event information for
 * administrators and auditors, including event type, actor role and ID, target
 * entity details, performed action, optional description, and timestamps. Only
 * active (non-deleted) audit log entries are returned.
 *
 * @param props - Object containing the admin payload and audit log ID
 * @param props.admin - The authenticated admin making the request
 * @param props.id - The UUID of the audit log entry to retrieve
 * @returns The detailed audit log entry matching the given ID
 * @throws Error if the audit log entry does not exist or is soft deleted
 */
export async function getflexOfficeAdminAuditsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IFlexOfficeAuditLog> {
  const { admin, id } = props;

  const record = await MyGlobal.prisma.flex_office_audit_logs.findFirstOrThrow({
    where: {
      id,
      deleted_at: null,
    },
  });

  return {
    id: record.id,
    event_type: record.event_type,
    actor_type: record.actor_type,
    actor_id: record.actor_id ?? null,
    target_type: record.target_type ?? null,
    target_id: record.target_id ?? null,
    action: record.action,
    description: record.description ?? null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
