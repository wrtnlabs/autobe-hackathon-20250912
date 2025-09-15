import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { EventOrganizerPayload } from "../decorators/payload/EventOrganizerPayload";

/**
 * Permanently deletes an event attendee record for a specific regular user.
 *
 * This operation verifies that the authenticated event organizer owns the event
 * corresponding to the attendee record before performing the hard delete.
 *
 * @param props - The properties including eventOrganizer payload, regular user
 *   ID, and event attendee ID
 * @throws {Error} Throws if the attendee record is not found or authorization
 *   fails
 */
export async function deleteeventRegistrationEventOrganizerRegularUsersRegularUserIdAttendeesEventAttendeeId(props: {
  eventOrganizer: EventOrganizerPayload;
  regularUserId: string & tags.Format<"uuid">;
  eventAttendeeId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { eventOrganizer, regularUserId, eventAttendeeId } = props;

  const attendee =
    await MyGlobal.prisma.event_registration_event_attendees.findFirst({
      where: {
        id: eventAttendeeId,
        regular_user_id: regularUserId,
      },
      include: {
        event: true,
      },
    });

  if (!attendee) {
    throw new Error("Event attendee record not found");
  }

  if (
    attendee.event.event_registration_event_organizer_id !== eventOrganizer.id
  ) {
    throw new Error("Unauthorized to delete this attendee record");
  }

  await MyGlobal.prisma.event_registration_event_attendees.delete({
    where: {
      id: eventAttendeeId,
    },
  });
}
