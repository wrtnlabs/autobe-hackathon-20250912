import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationNotification";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve detailed information of a specific notification by its UUID.
 *
 * This function fetches a notification record from the
 * event_registration_notifications table. It returns the full notification
 * object including user association, type, content, read flag, creation/update
 * timestamps, and optional deletion timestamp.
 *
 * Authorization: Requires an authenticated admin user.
 *
 * @param props - Object containing the admin payload and the notification ID to
 *   retrieve
 * @param props.admin - The authenticated admin making the request
 * @param props.notificationId - The UUID of the target notification
 * @returns The detailed notification information matching the ID
 * @throws {Error} Throws if the notification with the given ID does not exist
 */
export async function geteventRegistrationAdminNotificationsNotificationId(props: {
  admin: AdminPayload;
  notificationId: string & tags.Format<"uuid">;
}): Promise<IEventRegistrationNotification> {
  const { notificationId } = props;
  const notification =
    await MyGlobal.prisma.event_registration_notifications.findUniqueOrThrow({
      where: { id: notificationId },
      select: {
        id: true,
        user_id: true,
        type: true,
        content: true,
        read: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  return {
    id: notification.id,
    user_id: notification.user_id ?? null,
    type: notification.type,
    content: notification.content,
    read: notification.read,
    created_at: toISOStringSafe(notification.created_at),
    updated_at: toISOStringSafe(notification.updated_at),
    deleted_at: notification.deleted_at
      ? toISOStringSafe(notification.deleted_at)
      : null,
  };
}
