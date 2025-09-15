import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventWaitlist";
import { EventOrganizerPayload } from "../decorators/payload/EventOrganizerPayload";

/**
 * Retrieve detailed event waitlist entry for a given regular user.
 *
 * This function fetches the waitlist entry by eventWaitlistId and
 * regularUserId, ensuring the event organizer is authorized to access the
 * data.
 *
 * @param props - Request properties containing: eventOrganizer - Authenticated
 *   event organizer user context regularUserId - UUID of the regular user whose
 *   waitlist is fetched eventWaitlistId - UUID of the specific waitlist entry
 * @returns The detailed event waitlist record matching the criteria
 * @throws Error if the waitlist record is not found
 */
export async function geteventRegistrationEventOrganizerRegularUsersRegularUserIdWaitlistsEventWaitlistId(props: {
  eventOrganizer: EventOrganizerPayload;
  regularUserId: string & tags.Format<"uuid">;
  eventWaitlistId: string & tags.Format<"uuid">;
}): Promise<IEventRegistrationEventWaitlist> {
  const { eventOrganizer, regularUserId, eventWaitlistId } = props;

  const waitlistEntry =
    await MyGlobal.prisma.event_registration_event_waitlists.findFirstOrThrow({
      where: {
        id: eventWaitlistId,
        regular_user_id: regularUserId,
      },
    });

  return {
    id: waitlistEntry.id,
    event_id: waitlistEntry.event_id,
    regular_user_id: waitlistEntry.regular_user_id,
    created_at: toISOStringSafe(waitlistEntry.created_at),
    updated_at: toISOStringSafe(waitlistEntry.updated_at),
  };
}
