import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationNotification";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Get a single notification of a regular user
 *
 * Retrieves a specific notification belonging to a regular user by notification
 * ID. Validates that the notification belongs to the specified regular user to
 * enforce authorization. Returns detailed notification information including
 * type, content, read status, and timestamps.
 *
 * @param props - Object containing the authenticated regular user,
 *   regularUserId, and notificationId
 * @param props.regularUser - The authenticated regular user making the request
 * @param props.regularUserId - Unique identifier of the target regular user
 * @param props.notificationId - Unique identifier of the target notification
 * @returns Detailed notification information conforming to
 *   IEventRegistrationNotification
 * @throws {Error} Throws if the notification is not found or does not belong to
 *   the user
 */
export async function geteventRegistrationRegularUserRegularUsersRegularUserIdNotificationsNotificationId(props: {
  regularUser: RegularuserPayload;
  regularUserId: string & tags.Format<"uuid">;
  notificationId: string & tags.Format<"uuid">;
}): Promise<IEventRegistrationNotification> {
  const { regularUser, regularUserId, notificationId } = props;

  const notification =
    await MyGlobal.prisma.event_registration_notifications.findFirstOrThrow({
      where: {
        id: notificationId,
        user_id: regularUserId,
      },
    });

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
