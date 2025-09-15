import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventWaitlist";
import { EventOrganizerPayload } from "../decorators/payload/EventOrganizerPayload";

/**
 * Update an event waitlist entry.
 *
 * This operation updates the waitlist entry identified by eventWaitlistId for
 * the event specified by eventId. Authorized roles "eventOrganizer" or "admin"
 * can modify the waitlist entry's data as allowed by the schema.
 *
 * It checks that the authenticated eventOrganizer is indeed the organizer of
 * the event before allowing updates.
 *
 * @param props - Object containing eventOrganizer auth payload, eventId,
 *   eventWaitlistId, and update body
 * @param props.eventOrganizer - The authenticated event organizer making the
 *   request
 * @param props.eventId - UUID of the event for which the waitlist entry belongs
 * @param props.eventWaitlistId - UUID of the waitlist entry to update
 * @param props.body - Update data for the waitlist entry
 * @returns The updated waitlist entry with all fields
 * @throws {Error} When the waitlist entry does not belong to the event
 * @throws {Error} When the event is not organized by the authenticated user
 * @throws {Error} If waitlist entry or event is not found
 */
export async function puteventRegistrationEventOrganizerEventsEventIdWaitlistsEventWaitlistId(props: {
  eventOrganizer: EventOrganizerPayload;
  eventId: string & tags.Format<"uuid">;
  eventWaitlistId: string & tags.Format<"uuid">;
  body: IEventRegistrationEventWaitlist.IUpdate;
}): Promise<IEventRegistrationEventWaitlist> {
  const { eventOrganizer, eventId, eventWaitlistId, body } = props;

  const waitlist =
    await MyGlobal.prisma.event_registration_event_waitlists.findUniqueOrThrow({
      where: { id: eventWaitlistId },
      select: {
        id: true,
        event_id: true,
        regular_user_id: true,
        created_at: true,
        updated_at: true,
      },
    });

  if (waitlist.event_id !== eventId) {
    throw new Error("Waitlist entry does not belong to the specified event");
  }

  const event =
    await MyGlobal.prisma.event_registration_events.findUniqueOrThrow({
      where: { id: eventId },
      select: {
        id: true,
        organizer_id: true,
      },
    });

  if (event.organizer_id !== eventOrganizer.id) {
    throw new Error("Unauthorized: You are not the organizer of this event");
  }

  const updateData: {
    event_id?: string | null;
    regular_user_id?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
  } = {};

  if ("event_id" in body) {
    updateData.event_id =
      body.event_id === null ? null : (body.event_id ?? undefined);
  }
  if ("regular_user_id" in body) {
    updateData.regular_user_id =
      body.regular_user_id === null
        ? null
        : (body.regular_user_id ?? undefined);
  }
  if ("created_at" in body) {
    updateData.created_at =
      body.created_at === null ? null : (body.created_at ?? undefined);
  }
  if ("updated_at" in body) {
    updateData.updated_at =
      body.updated_at === null ? null : (body.updated_at ?? undefined);
  }

  const updated =
    await MyGlobal.prisma.event_registration_event_waitlists.update({
      where: { id: eventWaitlistId },
      data: updateData,
      select: {
        id: true,
        event_id: true,
        regular_user_id: true,
        created_at: true,
        updated_at: true,
      },
    });

  return {
    id: updated.id,
    event_id: updated.event_id,
    regular_user_id: updated.regular_user_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
