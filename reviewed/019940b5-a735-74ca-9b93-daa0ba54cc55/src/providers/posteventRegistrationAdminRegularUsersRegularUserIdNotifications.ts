import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationNotification";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a notification for a regular user.
 *
 * This endpoint creates a new notification record for the specified regular
 * user. Only administrators can perform this operation.
 *
 * @param props - Object containing admin authentication, target user ID, and
 *   notification details
 * @param props.admin - Authenticated admin payload
 * @param props.regularUserId - UUID of the regular user to receive the
 *   notification
 * @param props.body - Notification creation details: type, content, read flag
 * @returns The created notification record with timestamps
 * @throws {Error} Throws if the database operation fails
 */
export async function posteventRegistrationAdminRegularUsersRegularUserIdNotifications(props: {
  admin: AdminPayload;
  regularUserId: string & tags.Format<"uuid">;
  body: IEventRegistrationNotification.ICreate;
}): Promise<IEventRegistrationNotification> {
  const { admin, regularUserId, body } = props;

  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const notification =
    await MyGlobal.prisma.event_registration_notifications.create({
      data: {
        id,
        user_id: regularUserId,
        type: body.type,
        content: body.content,
        read: body.read,
        created_at: now,
        updated_at: now,
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
      : undefined,
  };
}
