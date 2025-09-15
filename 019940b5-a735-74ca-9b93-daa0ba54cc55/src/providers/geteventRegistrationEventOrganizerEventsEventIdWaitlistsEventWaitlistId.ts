import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventWaitlist";
import { EventOrganizerPayload } from "../decorators/payload/EventOrganizerPayload";

/**
 * Retrieve specific waitlist entry details
 *
 * This operation retrieves the detailed information of a specific waitlist
 * entry by its unique ID for a given event. Only authorized event organizer or
 * admin users can access this data.
 *
 * @param props - Object containing the authenticated event organizer, event ID,
 *   and the waitlist entry ID.
 * @param props.eventOrganizer - The authenticated event organizer making the
 *   request
 * @param props.eventId - Unique identifier of the event
 * @param props.eventWaitlistId - Unique identifier of the waitlist entry
 * @returns The detailed waitlist entry information
 * @throws {Error} If the waitlist entry does not exist for the given event or
 *   access is unauthorized
 */
export async function geteventRegistrationEventOrganizerEventsEventIdWaitlistsEventWaitlistId(props: {
  eventOrganizer: EventOrganizerPayload;
  eventId: string & tags.Format<"uuid">;
  eventWaitlistId: string & tags.Format<"uuid">;
}): Promise<IEventRegistrationEventWaitlist> {
  const { eventOrganizer, eventId, eventWaitlistId } = props;

  // Verify the waitlist entry belongs to the requested event
  const waitlistEntry =
    await MyGlobal.prisma.event_registration_event_waitlists.findFirstOrThrow({
      where: { id: eventWaitlistId, event_id: eventId },
    });

  // Return the waitlist entry with all date fields converted to ISO strings
  return {
    id: waitlistEntry.id as string & tags.Format<"uuid">,
    event_id: waitlistEntry.event_id as string & tags.Format<"uuid">,
    regular_user_id: waitlistEntry.regular_user_id as string &
      tags.Format<"uuid">,
    created_at: toISOStringSafe(waitlistEntry.created_at),
    updated_at: toISOStringSafe(waitlistEntry.updated_at),
  };
}
