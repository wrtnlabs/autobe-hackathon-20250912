import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationNotification";
import { EventOrganizerPayload } from "../decorators/payload/EventOrganizerPayload";

/**
 * Retrieve detailed information of a notification by ID
 *
 * This operation fetches a notification record by its unique UUID from the
 * event_registration_notifications table. It returns all fields including id,
 * user association, type, content, read status, and timestamps, converting all
 * date and datetime fields to ISO string format.
 *
 * Authorization is checked to ensure that the requesting event organizer can
 * only access notifications which belong to them or system-wide notifications
 * (user_id is null).
 *
 * @param props - Object containing the authenticated event organizer and the
 *   notification UUID
 * @param props.eventOrganizer - Authenticated event organizer payload
 * @param props.notificationId - UUID of the notification to retrieve
 * @returns Detailed notification object conforming to
 *   IEventRegistrationNotification
 * @throws {Error} When the notification does not exist or the user is
 *   unauthorized
 */
export async function geteventRegistrationEventOrganizerNotificationsNotificationId(props: {
  eventOrganizer: EventOrganizerPayload;
  notificationId: string & tags.Format<"uuid">;
}): Promise<IEventRegistrationNotification> {
  const { eventOrganizer, notificationId } = props;

  // Fetch notification by ID or throw if not found
  const notification =
    await MyGlobal.prisma.event_registration_notifications.findUniqueOrThrow({
      where: { id: notificationId },
    });

  // Authorization: user_id must be null (system-wide) or match eventOrganizer.id
  if (
    notification.user_id !== null &&
    notification.user_id !== undefined &&
    notification.user_id !== eventOrganizer.id
  ) {
    throw new Error("Unauthorized: You can only access your own notifications");
  }

  // Return notification object with all required properties and date string formatting
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
