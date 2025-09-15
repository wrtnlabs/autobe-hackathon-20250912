import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationNotification";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Updates an existing notification for a regular user by notification ID.
 *
 * This operation permits modifications such as marking notifications read or
 * updating content. It verifies ownership to ensure users can only update their
 * own notifications. Returns the updated notification data including all fields
 * with ISO 8601 timestamps.
 *
 * @param props - Input containing authenticated regularUser, notificationId
 *   path parameter, and update body
 * @param props.regularUser - The authenticated regular user payload
 * @param props.notificationId - UUID of the notification to update
 * @param props.body - Partial update data conforming to
 *   IEventRegistrationNotification.IUpdate
 * @returns The updated notification record with all relevant fields
 * @throws {Error} When the notification is not found or user is unauthorized
 */
export async function puteventRegistrationRegularUserNotificationsNotificationId(props: {
  regularUser: RegularuserPayload;
  notificationId: string & tags.Format<"uuid">;
  body: IEventRegistrationNotification.IUpdate;
}): Promise<IEventRegistrationNotification> {
  const { regularUser, notificationId, body } = props;

  const notification =
    await MyGlobal.prisma.event_registration_notifications.findUniqueOrThrow({
      where: { id: notificationId },
    });

  if (notification.user_id !== regularUser.id) {
    throw new Error("Unauthorized: Cannot update notification of another user");
  }

  const updated = await MyGlobal.prisma.event_registration_notifications.update(
    {
      where: { id: notificationId },
      data: {
        user_id:
          body.user_id === undefined ? undefined : (body.user_id ?? null),
        type: body.type === undefined ? undefined : (body.type ?? null),
        content:
          body.content === undefined ? undefined : (body.content ?? null),
        read: body.read === undefined ? undefined : (body.read ?? null),
        deleted_at:
          body.deleted_at === undefined ? undefined : (body.deleted_at ?? null),
        updated_at: toISOStringSafe(new Date()),
      },
    },
  );

  return {
    id: updated.id as string & tags.Format<"uuid">,
    user_id: updated.user_id ?? null,
    type: updated.type,
    content: updated.content,
    read: updated.read,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };
}
