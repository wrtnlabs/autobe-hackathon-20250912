import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventWaitlist";
import { EventOrganizerPayload } from "../decorators/payload/EventOrganizerPayload";

/**
 * Adds a new entry to the waitlist for a specified event.
 *
 * Allows authorized event organizers to add a regular user to an event's
 * waitlist when the event capacity is full. This maintains FIFO order of
 * waitlist entries using creation timestamps.
 *
 * @param props - Object containing event organizer authorization, the target
 *   event ID, and the waitlist creation payload linking the regular user to the
 *   event.
 * @param props.eventOrganizer - Authorized event organizer payload.
 * @param props.eventId - UUID of the event to add the waitlist entry for.
 * @param props.body - Payload with required fields: event_id and
 *   regular_user_id.
 * @returns Newly created waitlist entry with all metadata fields including
 *   timestamps.
 * @throws {Error} When the creation operation fails due to DB constraints or
 *   connectivity.
 */
export async function posteventRegistrationEventOrganizerEventsEventIdWaitlists(props: {
  eventOrganizer: EventOrganizerPayload;
  eventId: string & tags.Format<"uuid">;
  body: IEventRegistrationEventWaitlist.ICreate;
}): Promise<IEventRegistrationEventWaitlist> {
  const id = v4() as string & tags.Format<"uuid">;
  const createdAt = toISOStringSafe(new Date());
  const updatedAt = toISOStringSafe(new Date());

  const created =
    await MyGlobal.prisma.event_registration_event_waitlists.create({
      data: {
        id,
        event_id: props.body.event_id,
        regular_user_id: props.body.regular_user_id,
        created_at: createdAt,
        updated_at: updatedAt,
      },
    });

  return {
    id: created.id,
    event_id: created.event_id,
    regular_user_id: created.regular_user_id,
    created_at: createdAt,
    updated_at: updatedAt,
  };
}
