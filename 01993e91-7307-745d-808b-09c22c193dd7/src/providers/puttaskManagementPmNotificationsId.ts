import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotification";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Update notification properties such as read status.
 *
 * This endpoint enables updating properties of a notification, typically to
 * mark it as read or unread.
 *
 * Only the owner PM user can update their notifications.
 *
 * @param props - Object containing pm payload, notification id, and update body
 * @param props.pm - Authenticated PM user performing the update
 * @param props.id - UUID of the notification to update
 * @param props.body - Request body with notification update fields
 * @returns The updated notification record
 * @throws {Error} When the notification is not found or access is denied
 */
export async function puttaskManagementPmNotificationsId(props: {
  pm: PmPayload;
  id: string & tags.Format<"uuid">;
  body: ITaskManagementNotification.IUpdate;
}): Promise<ITaskManagementNotification> {
  const { pm, id, body } = props;
  const now = toISOStringSafe(new Date());

  const notification =
    await MyGlobal.prisma.task_management_notifications.findFirst({
      where: {
        id,
        user_id: pm.id,
        deleted_at: null,
      },
    });

  if (!notification) {
    throw new Error(`Notification with id ${id} not found or access denied.`);
  }

  const updated = await MyGlobal.prisma.task_management_notifications.update({
    where: { id },
    data: {
      is_read: body.is_read ?? undefined,
      read_at: body.read_at ?? undefined,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    user_id: updated.user_id,
    task_id: updated.task_id ?? null,
    notification_type: updated.notification_type,
    is_read: updated.is_read,
    read_at: updated.read_at ? toISOStringSafe(updated.read_at) : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
