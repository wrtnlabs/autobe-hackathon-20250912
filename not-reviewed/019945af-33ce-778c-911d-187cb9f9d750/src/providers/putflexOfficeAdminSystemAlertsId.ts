import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeSystemAlerts } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeSystemAlerts";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing system alert identified by its unique ID.
 *
 * Allows an admin to modify alert severity, message, resolution status, and
 * resolved timestamp while updating the record's updated_at timestamp.
 *
 * @param props - Object containing admin authorization payload, alert ID, and
 *   update data.
 * @param props.admin - The authenticated admin performing the update.
 * @param props.id - Unique UUID of the system alert to update.
 * @param props.body - Partial update payload for the system alert.
 * @returns The updated system alert with all fields populated and proper
 *   date-time strings.
 * @throws {Error} Throws if the alert with the given ID does not exist.
 */
export async function putflexOfficeAdminSystemAlertsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IFlexOfficeSystemAlerts.IUpdate;
}): Promise<IFlexOfficeSystemAlerts> {
  const { admin, id, body } = props;
  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.flex_office_system_alerts.update({
    where: { id },
    data: {
      severity: body.severity ?? undefined,
      message: body.message === undefined ? undefined : body.message,
      is_resolved: body.is_resolved ?? undefined,
      resolved_at: body.resolved_at ?? null,
      updated_at: now,
    },
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    severity: updated.severity,
    message: updated.message,
    is_resolved: updated.is_resolved,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    resolved_at: updated.resolved_at
      ? toISOStringSafe(updated.resolved_at)
      : null,
  };
}
