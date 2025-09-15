import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotification";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Retrieve detailed information for a specific notification by ID.
 *
 * This endpoint fetches the notification record for a PM user by its unique
 * identifier. Authorization is enforced to ensure only the owner PM can access
 * the notification.
 *
 * @param props - Object containing the PM payload and notification ID.
 * @param props.pm - Authenticated PM user making the request.
 * @param props.id - UUID of the notification to retrieve.
 * @returns The detailed notification information.
 * @throws {Error} When the notification does not exist.
 * @throws {Error} When the PM user is not authorized to access the
 *   notification.
 */
export async function gettaskManagementPmNotificationsId(props: {
  pm: PmPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ITaskManagementNotification> {
  const { pm, id } = props;

  const notification =
    await MyGlobal.prisma.task_management_notifications.findUnique({
      where: { id },
      select: {
        id: true,
        user_id: true,
        task_id: true,
        notification_type: true,
        is_read: true,
        read_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  if (!notification) throw new Error("Notification not found");
  if (notification.user_id !== pm.id)
    throw new Error("Unauthorized access to notification");

  return {
    id: notification.id,
    user_id: notification.user_id,
    task_id: notification.task_id ?? null,
    notification_type: notification.notification_type,
    is_read: notification.is_read,
    read_at: notification.read_at
      ? toISOStringSafe(notification.read_at)
      : null,
    created_at: toISOStringSafe(notification.created_at),
    updated_at: toISOStringSafe(notification.updated_at),
    deleted_at: notification.deleted_at
      ? toISOStringSafe(notification.deleted_at)
      : null,
  };
}
