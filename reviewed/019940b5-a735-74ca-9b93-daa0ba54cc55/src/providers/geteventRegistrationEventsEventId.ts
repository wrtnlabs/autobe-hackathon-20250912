import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEvent";

/**
 * Retrieve details of a single event by its eventId.
 *
 * This operation fetches the event from the database by its unique UUID, only
 * if it is not soft-deleted (deleted_at is null).
 *
 * @param props - Object containing the eventId parameter
 * @param props.eventId - Unique identifier of the event
 * @returns Detailed event information conforming to IEventRegistrationEvent
 * @throws {Error} Event not found
 */
export async function geteventRegistrationEventsEventId(props: {
  eventId: string & tags.Format<"uuid">;
}): Promise<IEventRegistrationEvent> {
  const { eventId } = props;

  const event = await MyGlobal.prisma.event_registration_events.findFirst({
    where: { id: eventId, deleted_at: null },
  });
  if (!event) throw new Error("Event not found");

  return {
    id: event.id,
    event_category_id: event.event_category_id,
    name: event.name,
    date: toISOStringSafe(event.date),
    location: event.location,
    capacity: event.capacity,
    description: event.description ?? undefined,
    ticket_price: event.ticket_price,
    status: event.status as "scheduled" | "cancelled" | "completed",
    created_at: toISOStringSafe(event.created_at),
    updated_at: toISOStringSafe(event.updated_at),
    deleted_at: event.deleted_at ? toISOStringSafe(event.deleted_at) : null,
  };
}
