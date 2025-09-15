import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeSystemAlerts } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeSystemAlerts";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new system alert notification
 *
 * This operation creates a new system alert record capturing severity, message,
 * is_resolved (default false), and timestamps. The system alert acts as a
 * notification mechanism for monitoring system health, security, or performance
 * issues. This operation requires admin privileges.
 *
 * @param props - Object containing the authenticated admin and alert creation
 *   data
 * @param props.admin - Authenticated admin payload performing the operation
 * @param props.body - Alert creation data including severity, message, and
 *   optional is_resolved
 * @returns The created system alert record
 * @throws {Error} If the creation fails due to database or other internal
 *   errors
 */
export async function postflexOfficeAdminSystemAlerts(props: {
  admin: AdminPayload;
  body: IFlexOfficeSystemAlerts.ICreate;
}): Promise<IFlexOfficeSystemAlerts> {
  const { admin, body } = props;

  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.flex_office_system_alerts.create({
    data: {
      id,
      severity: body.severity,
      message: body.message,
      is_resolved: body.is_resolved ?? false,
      created_at: now,
      updated_at: now,
      resolved_at: null,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    severity: created.severity,
    message: created.message,
    is_resolved: created.is_resolved,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    resolved_at: created.resolved_at
      ? toISOStringSafe(created.resolved_at)
      : null,
  };
}
