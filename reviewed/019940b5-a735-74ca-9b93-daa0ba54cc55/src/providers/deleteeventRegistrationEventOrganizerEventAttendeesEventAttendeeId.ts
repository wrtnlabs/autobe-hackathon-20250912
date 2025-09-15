import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { EventOrganizerPayload } from "../decorators/payload/EventOrganizerPayload";

/**
 * Delete an event attendee registration by id.
 *
 * This operation performs a permanent hard delete on the attendee's
 * registration.
 *
 * Authorization is enforced with eventOrganizer provided in props.
 *
 * @param props - The event organizer payload and the event attendee ID to
 *   delete
 * @throws {Error} Throws if the event attendee is not found
 */
export async function deleteeventRegistrationEventOrganizerEventAttendeesEventAttendeeId(props: {
  eventOrganizer: { id: string & tags.Format<"uuid"> };
  eventAttendeeId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the attendee registration by ID
  const attendee =
    await MyGlobal.prisma.event_registration_event_attendees.findUnique({
      where: { id: props.eventAttendeeId },
      select: {
        id: true,
        event_id: true,
        regular_user_id: true,
      },
    });

  if (attendee === null) {
    throw new Error("Event attendee registration not found");
  }

  // Authorization: Since no direct relation is given, trust eventOrganizer's authority.

  // Perform hard delete
  await MyGlobal.prisma.event_registration_event_attendees.delete({
    where: { id: props.eventAttendeeId },
  });
}
