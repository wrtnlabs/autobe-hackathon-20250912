import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventAttendee } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventAttendee";
import { EventOrganizerPayload } from "../decorators/payload/EventOrganizerPayload";

/**
 * Retrieve detailed information of a specific event attendee identified by
 * eventAttendeeId.
 *
 * Access is restricted to authenticated eventOrganizers. This function fetches
 * the full attendee record, including event and regular user IDs and timestamp
 * info.
 *
 * @param props - Object containing the authenticated eventOrganizer and the
 *   eventAttendeeId to retrieve.
 * @returns The detailed event attendee record.
 * @throws {Error} When the event attendee ID does not correspond to any
 *   existing record.
 */
export async function geteventRegistrationEventOrganizerEventAttendeesEventAttendeeId(props: {
  eventOrganizer: EventOrganizerPayload;
  eventAttendeeId: string & tags.Format<"uuid">;
}): Promise<IEventRegistrationEventAttendee> {
  const { eventAttendeeId } = props;

  const attendee =
    await MyGlobal.prisma.event_registration_event_attendees.findUniqueOrThrow({
      where: { id: eventAttendeeId },
    });

  return {
    id: attendee.id,
    event_id: attendee.event_id,
    regular_user_id: attendee.regular_user_id,
    created_at: toISOStringSafe(attendee.created_at),
    updated_at: toISOStringSafe(attendee.updated_at),
  };
}
