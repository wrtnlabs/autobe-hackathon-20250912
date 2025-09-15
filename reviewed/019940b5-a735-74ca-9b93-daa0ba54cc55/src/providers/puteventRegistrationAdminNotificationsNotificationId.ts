import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationNotification";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing notification.
 *
 * This endpoint updates properties of an existing notification identified by
 * its UUID. It supports marking a notification as read, updating the content,
 * type, user association, and soft deletion status. Only admins are authorized
 * to perform this operation.
 *
 * @param props - The function parameters
 * @param props.admin - The authenticated admin performing the update
 * @param props.notificationId - The UUID of the notification to update
 * @param props.body - The partial update data for the notification
 * @returns The fully updated notification record
 * @throws {Error} Throws if the notification with the given ID does not exist
 */
export async function puteventRegistrationAdminNotificationsNotificationId(props: {
  admin: AdminPayload;
  notificationId: string & tags.Format<"uuid">;
  body: IEventRegistrationNotification.IUpdate;
}): Promise<IEventRegistrationNotification> {
  const { admin, notificationId, body } = props;

  // Verify notification exists or throw
  await MyGlobal.prisma.event_registration_notifications.findUniqueOrThrow({
    where: { id: notificationId },
  });

  // Current timestamp for update
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Update notification
  const updated = await MyGlobal.prisma.event_registration_notifications.update(
    {
      where: { id: notificationId },
      data: {
        ...(body.user_id !== undefined ? { user_id: body.user_id } : {}),
        ...(body.type !== undefined ? { type: body.type } : {}),
        ...(body.content !== undefined ? { content: body.content } : {}),
        ...(body.read !== undefined ? { read: body.read } : {}),
        ...(body.deleted_at !== undefined
          ? { deleted_at: body.deleted_at }
          : {}),
        updated_at: now,
      },
    },
  );

  // Return with all dates converted to ISO strings with proper branding
  return {
    id: updated.id,
    user_id: updated.user_id ?? null,
    type: updated.type,
    content: updated.content,
    read: updated.read,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
