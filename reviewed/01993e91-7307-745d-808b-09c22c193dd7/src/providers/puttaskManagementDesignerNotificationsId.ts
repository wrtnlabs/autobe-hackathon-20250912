import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotification";
import { DesignerPayload } from "../decorators/payload/DesignerPayload";

/**
 * Update notification properties such as read status
 *
 * This endpoint enables updating properties of a notification, typically to
 * mark it as read or unread. Only the owner (designer) of the notification can
 * update it.
 *
 * @param props - Object containing the designer payload, notification id, and
 *   update body
 * @param props.designer - The authenticated designer making the update request
 * @param props.id - Unique identifier of the notification to update
 * @param props.body - Partial update fields of notification (is_read and
 *   read_at)
 * @returns The updated notification info with all fields
 * @throws {Error} When the notification does not exist or the user is not
 *   authorized
 */
export async function puttaskManagementDesignerNotificationsId(props: {
  designer: DesignerPayload;
  id: string & tags.Format<"uuid">;
  body: ITaskManagementNotification.IUpdate;
}): Promise<ITaskManagementNotification> {
  const { designer, id, body } = props;

  const notification =
    await MyGlobal.prisma.task_management_notifications.findFirst({
      where: {
        id,
        user_id: designer.id,
        deleted_at: null,
      },
    });

  if (!notification) {
    throw new Error("Notification not found or access denied");
  }

  const updated = await MyGlobal.prisma.task_management_notifications.update({
    where: { id },
    data: {
      is_read: body.is_read ?? undefined,
      read_at: body.read_at === undefined ? undefined : body.read_at,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    user_id: updated.user_id,
    task_id: updated.task_id ?? null,
    notification_type: updated.notification_type,
    is_read: updated.is_read,
    read_at: updated.read_at ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ?? null,
  };
}
