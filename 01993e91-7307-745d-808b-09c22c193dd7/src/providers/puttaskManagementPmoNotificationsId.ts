import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotification";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Update notification properties such as read status
 *
 * This endpoint allows a PMO user to update the read status and read timestamp
 * of a notification entity. Only the notification owner (user_id matching the
 * authenticated PMO's id) is authorized to perform this update.
 *
 * @param props - Contains the authenticated PMO user, notification id, and
 *   notification update data
 * @param props.pmo - The authenticated PMO user's payload
 * @param props.id - UUID of the notification to be updated
 * @param props.body - Update body containing is_read and read_at fields
 * @returns The updated notification entity with all fields
 * @throws {Error} When the notification does not exist (404)
 * @throws {Error} When the authenticated user is not the owner (403)
 */
export async function puttaskManagementPmoNotificationsId(props: {
  pmo: PmoPayload;
  id: string & tags.Format<"uuid">;
  body: ITaskManagementNotification.IUpdate;
}): Promise<ITaskManagementNotification> {
  const { pmo, id, body } = props;

  // Fetch the notification by unique id or throw (404)
  const notification =
    await MyGlobal.prisma.task_management_notifications.findUniqueOrThrow({
      where: { id },
    });

  // Authorization: Ensure notification belongs to authenticated PMO user
  if (notification.user_id !== pmo.id) {
    throw new Error("Forbidden: Cannot update others' notifications");
  }

  // Current timestamp as ISO string with branding
  const now = toISOStringSafe(new Date());

  // Update the notification record
  const updated = await MyGlobal.prisma.task_management_notifications.update({
    where: { id },
    data: {
      is_read: body.is_read ?? undefined,
      read_at: body.read_at ?? undefined,
      updated_at: now,
    },
  });

  // Return the updated notification with date conversions
  return {
    id: updated.id,
    user_id: updated.user_id,
    task_id: updated.task_id === null ? null : updated.task_id,
    notification_type: updated.notification_type,
    is_read: updated.is_read,
    read_at: updated.read_at === null ? null : updated.read_at,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at === null ? null : updated.deleted_at,
  };
}
