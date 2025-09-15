import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { EventOrganizerPayload } from "../decorators/payload/EventOrganizerPayload";

/**
 * Deletes an event waitlist entry by its unique ID.
 *
 * This hard delete operation removes the record permanently.
 *
 * Authorization: Only event organizers or admins should invoke this operation.
 *
 * @param props - Object containing eventOrganizer payload and waitlist entry ID
 * @param props.eventOrganizer - Authenticated event organizer making this
 *   request
 * @param props.eventWaitlistId - UUID of the event waitlist entry to delete
 * @throws {Error} If no event waitlist entry is found with the given ID
 */
export async function deleteeventRegistrationEventOrganizerEventWaitlistsEventWaitlistId(props: {
  eventOrganizer: EventOrganizerPayload;
  eventWaitlistId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { eventOrganizer, eventWaitlistId } = props;

  // Verify the waitlist entry exists
  const existing =
    await MyGlobal.prisma.event_registration_event_waitlists.findUnique({
      where: { id: eventWaitlistId },
    });
  if (!existing) throw new Error("Event waitlist entry not found");

  // Hard delete the waitlist entry
  await MyGlobal.prisma.event_registration_event_waitlists.delete({
    where: { id: eventWaitlistId },
  });
}
