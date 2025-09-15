import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventWaitlist";
import { EventOrganizerPayload } from "../decorators/payload/EventOrganizerPayload";

/**
 * Create a new event waitlist entry linking a regular user to an event
 * waitlist.
 *
 * This operation enforces that the user is not already registered as an
 * attendee or on the waitlist for the same event.
 *
 * Only authorized event organizers can perform this operation.
 *
 * @param props - Object containing eventOrganizer payload and waitlist creation
 *   data
 * @param props.eventOrganizer - Authenticated event organizer making the
 *   request
 * @param props.body - Data for creating the waitlist entry, including event and
 *   user IDs
 * @returns The newly created event waitlist entry with timestamps
 * @throws {Error} If the user is already on waitlist or already registered as
 *   attendee
 */
export async function posteventRegistrationEventOrganizerEventWaitlists(props: {
  eventOrganizer: EventOrganizerPayload;
  body: IEventRegistrationEventWaitlist.ICreate;
}): Promise<IEventRegistrationEventWaitlist> {
  const { eventOrganizer, body } = props;

  // Verify that the user is not already on the waitlist
  const existingWaitlist =
    await MyGlobal.prisma.event_registration_event_waitlists.findFirst({
      where: {
        event_id: body.event_id,
        regular_user_id: body.regular_user_id,
      },
    });
  if (existingWaitlist) {
    throw new Error("User is already on the waitlist for this event.");
  }

  // Verify that the user is not already an attendee
  const existingAttendee =
    await MyGlobal.prisma.event_registration_event_attendees.findFirst({
      where: {
        event_id: body.event_id,
        regular_user_id: body.regular_user_id,
      },
    });
  if (existingAttendee) {
    throw new Error("User is already registered as attendee for this event.");
  }

  // Generate new UUID and timestamps
  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  // Create the waitlist entry
  const created =
    await MyGlobal.prisma.event_registration_event_waitlists.create({
      data: {
        id,
        event_id: body.event_id,
        regular_user_id: body.regular_user_id,
        created_at: now,
        updated_at: now,
      },
    });

  // Return the created entry
  return {
    id: created.id,
    event_id: created.event_id,
    regular_user_id: created.regular_user_id,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
