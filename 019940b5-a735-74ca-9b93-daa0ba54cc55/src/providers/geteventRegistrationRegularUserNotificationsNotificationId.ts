import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationNotification";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Retrieve detailed information of a notification by its unique identifier for
 * a regular user.
 *
 * This function fetches the notification from the database and returns all
 * fields, verifying that the notification either belongs to the regular user or
 * is a system-wide notification. It converts all DateTime fields to ISO string
 * format.
 *
 * @param props - Object containing the authenticated regular user and the
 *   notification ID to fetch
 * @param props.regularUser - Authenticated payload of the regular user
 *   requesting the notification
 * @param props.notificationId - UUID string identifier of the notification
 * @returns The detailed notification record matching the given ID
 * @throws {Error} When the notification does not exist or the user is
 *   unauthorized to access it
 */
export async function geteventRegistrationRegularUserNotificationsNotificationId(props: {
  regularUser: RegularuserPayload;
  notificationId: string & tags.Format<"uuid">;
}): Promise<IEventRegistrationNotification> {
  const { regularUser, notificationId } = props;

  const notification =
    await MyGlobal.prisma.event_registration_notifications.findUnique({
      where: {
        id: notificationId,
      },
    });

  if (!notification) {
    throw new Error("Notification not found");
  }

  if (
    notification.user_id !== null &&
    notification.user_id !== undefined &&
    notification.user_id !== regularUser.id
  ) {
    throw new Error("Unauthorized access to this notification");
  }

  return {
    id: notification.id,
    user_id: notification.user_id ?? undefined,
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
