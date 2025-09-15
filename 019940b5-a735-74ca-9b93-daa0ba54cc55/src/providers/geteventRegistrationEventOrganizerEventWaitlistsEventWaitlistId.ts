import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventWaitlist";
import { EventOrganizerPayload } from "../decorators/payload/EventOrganizerPayload";

/**
 * Retrieve details of a specific event waitlist entry.
 *
 * This operation fetches an event waitlist entry by its unique identifier. It
 * returns the event id, regular user id on the waitlist, and audit timestamps.
 *
 * Authorization is required: only event organizers with proper access can
 * retrieve this data.
 *
 * @param props - Object containing eventOrganizer payload and waitlist entry id
 * @param props.eventOrganizer - Authenticated event organizer making the
 *   request
 * @param props.eventWaitlistId - UUID of the event waitlist entry to retrieve
 * @returns Detailed event waitlist entry information
 * @throws {Error} If no waitlist entry is found with the specified ID
 */
export async function geteventRegistrationEventOrganizerEventWaitlistsEventWaitlistId(props: {
  eventOrganizer: EventOrganizerPayload;
  eventWaitlistId: string & tags.Format<"uuid">;
}): Promise<IEventRegistrationEventWaitlist> {
  const { eventOrganizer, eventWaitlistId } = props;

  const waitlistEntry =
    await MyGlobal.prisma.event_registration_event_waitlists.findUniqueOrThrow({
      where: { id: eventWaitlistId },
    });

  return {
    id: waitlistEntry.id,
    event_id: waitlistEntry.event_id,
    regular_user_id: waitlistEntry.regular_user_id,
    created_at: toISOStringSafe(waitlistEntry.created_at),
    updated_at: toISOStringSafe(waitlistEntry.updated_at),
  };
}
