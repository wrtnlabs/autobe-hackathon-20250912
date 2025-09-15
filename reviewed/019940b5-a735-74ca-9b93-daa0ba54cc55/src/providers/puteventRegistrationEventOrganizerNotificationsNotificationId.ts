import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationNotification";
import { EventOrganizerPayload } from "../decorators/payload/EventOrganizerPayload";

/**
 * Update an existing notification
 *
 * This endpoint allows an event organizer to update properties of a
 * notification they own, such as marking it as read or updating the content
 * message.
 *
 * Authorization is enforced: only the owner event organizer may update.
 *
 * @param props - Parameters including the event organizer, the notification ID,
 *   and the update body with optional updated fields.
 * @returns Updated notification information
 * @throws {Error} If the notification does not exist or user is unauthorized
 */
export async function puteventRegistrationEventOrganizerNotificationsNotificationId(props: {
  eventOrganizer: { id: string & tags.Format<"uuid">; type: "eventOrganizer" };
  notificationId: string & tags.Format<"uuid">;
  body: {
    user_id?: (string & tags.Format<"uuid">) | null | undefined;
    type?: string | null | undefined;
    content?: string | null | undefined;
    read?: boolean | null | undefined;
    deleted_at?: (string & tags.Format<"date-time">) | null | undefined;
  };
}): Promise<IEventRegistrationNotification> {
  const { eventOrganizer, notificationId, body } = props;

  const notification =
    await MyGlobal.prisma.event_registration_notifications.findUniqueOrThrow({
      where: { id: notificationId },
    });

  if (notification.user_id !== eventOrganizer.id) {
    throw new Error("Unauthorized: You can only update your own notifications");
  }

  const updated = await MyGlobal.prisma.event_registration_notifications.update(
    {
      where: { id: notificationId },
      data: {
        user_id: body.user_id === null ? null : (body.user_id ?? undefined),
        type: body.type === null ? null : (body.type ?? undefined),
        content: body.content === null ? null : (body.content ?? undefined),
        read: body.read ?? undefined,
        deleted_at:
          body.deleted_at === null ? null : (body.deleted_at ?? undefined),
        updated_at: toISOStringSafe(new Date()),
      },
    },
  );

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
