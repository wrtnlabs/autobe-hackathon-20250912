import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Deletes a notification by its unique identifier for a regular user.
 *
 * This operation permanently removes the notification record from the database.
 * Authorization ensures the notification belongs to the requesting regular
 * user.
 *
 * @param props - Object containing the regular user and notification ID
 * @param props.regularUser - The authenticated regular user payload
 * @param props.notificationId - The UUID of the notification to delete
 * @returns Void
 * @throws {Error} When the notification does not exist
 * @throws {Error} When the notification does not belong to the regular user
 */
export async function deleteeventRegistrationRegularUserNotificationsNotificationId(props: {
  regularUser: RegularuserPayload;
  notificationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { regularUser, notificationId } = props;

  const notification =
    await MyGlobal.prisma.event_registration_notifications.findUnique({
      where: { id: notificationId },
    });

  if (!notification) {
    throw new Error(`Notification not found: ${notificationId}`);
  }

  if (notification.user_id !== regularUser.id) {
    throw new Error(
      `Unauthorized: access denied for notification ${notificationId}`,
    );
  }

  await MyGlobal.prisma.event_registration_notifications.delete({
    where: { id: notificationId },
  });
}
