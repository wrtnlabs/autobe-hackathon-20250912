import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEvent";
import { EventOrganizerPayload } from "../decorators/payload/EventOrganizerPayload";

/**
 * Creates a new event with the provided details.
 *
 * This operation requires authentication as an event organizer. The event
 * details must include a valid event category, name, date (ISO 8601 string),
 * location, capacity (positive integer), optional description, ticket price,
 * and status which must be one of the allowed strings: "scheduled",
 * "cancelled", or "completed".
 *
 * On success, the newly created event entity is returned including generated
 * UUID and timestamps.
 *
 * @param props - Object containing authenticated event organizer and event
 *   creation data
 * @param props.eventOrganizer - Authenticated event organizer executing this
 *   operation
 * @param props.body - Event creation details complying with
 *   IEventRegistrationEvent.ICreate
 * @returns The newly created event entity with all fields
 * @throws {Error} When the specified event category does not exist
 */
export async function posteventRegistrationEventOrganizerEvents(props: {
  eventOrganizer: EventOrganizerPayload;
  body: IEventRegistrationEvent.ICreate;
}): Promise<IEventRegistrationEvent> {
  const { eventOrganizer, body } = props;

  // Validate event_category_id existence
  const category =
    await MyGlobal.prisma.event_registration_event_categories.findUnique({
      where: { id: body.event_category_id },
    });
  if (!category)
    throw new Error(`Event category not found: ${body.event_category_id}`);

  // Generate new event id and timestamps
  const newId = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  // Create event
  const created = await MyGlobal.prisma.event_registration_events.create({
    data: {
      id: newId,
      event_category_id: body.event_category_id,
      name: body.name,
      date: body.date,
      location: body.location,
      capacity: body.capacity,
      description: body.description ?? null,
      ticket_price: body.ticket_price,
      status: body.status,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    event_category_id: created.event_category_id,
    name: created.name,
    date: toISOStringSafe(created.date),
    location: created.location,
    capacity: created.capacity,
    description: created.description ?? null,
    ticket_price: created.ticket_price,
    status: created.status as "scheduled" | "cancelled" | "completed",
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
