import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { EventOrganizerPayload } from "../decorators/payload/EventOrganizerPayload";

/**
 * Delete a notification by its unique identifier.
 *
 * This operation permanently deletes a notification record from the
 * event_registration_notifications table. It ensures that only the owner event
 * organizer can delete their own notifications.
 *
 * @param props - Properties containing the event organizer's payload and
 *   notification ID to delete.
 * @param props.eventOrganizer - The authenticated event organizer performing
 *   the deletion.
 * @param props.notificationId - The UUID of the notification to be deleted.
 * @throws {Error} Throws if the notification does not exist or if the user is
 *   unauthorized to delete it.
 */
export async function deleteeventRegistrationEventOrganizerNotificationsNotificationId(props: {
  eventOrganizer: EventOrganizerPayload;
  notificationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { eventOrganizer, notificationId } = props;

  const notification =
    await MyGlobal.prisma.event_registration_notifications.findUnique({
      where: { id: notificationId },
    });

  if (!notification) {
    throw new Error("Notification not found");
  }

  if (notification.user_id !== eventOrganizer.id) {
    throw new Error("Unauthorized: You can only delete your own notifications");
  }

  await MyGlobal.prisma.event_registration_notifications.delete({
    where: { id: notificationId },
  });
}
