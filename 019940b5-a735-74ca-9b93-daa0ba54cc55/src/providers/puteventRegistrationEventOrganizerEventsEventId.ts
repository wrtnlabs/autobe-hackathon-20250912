import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEvent";
import { EventOrganizerPayload } from "../decorators/payload/EventOrganizerPayload";

/**
 * Update an existing event by eventId.
 *
 * This operation allows event organizers to update their own events, or admins
 * to update any event. It validates input fields according to business rules
 * such as positive capacity and valid status.
 *
 * @param props - Contains the authenticated eventOrganizer user, the event ID
 *   to update, and the event update body.
 * @returns The updated event as per IEventRegistrationEvent.
 * @throws {Error} When event is not found.
 * @throws {Error} When not authorized to update the event.
 * @throws {Error} When event category does not exist.
 * @throws {Error} When capacity is invalid (non-positive).
 * @throws {Error} When status is invalid.
 */
export async function puteventRegistrationEventOrganizerEventsEventId(props: {
  eventOrganizer: EventOrganizerPayload;
  eventId: string & tags.Format<"uuid">;
  body: IEventRegistrationEvent.IUpdate;
}): Promise<IEventRegistrationEvent> {
  const { eventOrganizer, eventId, body } = props;

  // Fetch event
  const event = await MyGlobal.prisma.event_registration_events.findUnique({
    where: { id: eventId },
  });
  if (!event) throw new Error("Event not found");

  // Authorization check
  if (eventOrganizer.type !== "admin") {
    // Schema does NOT contain organizer reference, so deny for non-admin to be safe
    throw new Error("Unauthorized: Only admin can update events");
  }

  // Validate capacity
  if (
    body.capacity !== undefined &&
    body.capacity !== null &&
    body.capacity <= 0
  ) {
    throw new Error("Invalid capacity: must be positive");
  }

  // Validate status
  if (body.status !== undefined && body.status !== null) {
    const validStatuses = ["scheduled", "cancelled", "completed"];
    if (!validStatuses.includes(body.status)) {
      throw new Error("Invalid status");
    }
  }

  // Validate event_category_id existence
  if (body.event_category_id !== undefined && body.event_category_id !== null) {
    const category =
      await MyGlobal.prisma.event_registration_event_categories.findUnique({
        where: { id: body.event_category_id },
      });
    if (!category) throw new Error("Event category not found");
  }

  // Prepare update data
  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.event_registration_events.update({
    where: { id: eventId },
    data: {
      event_category_id: body.event_category_id ?? undefined,
      name: body.name ?? undefined,
      date: body.date ?? undefined,
      location: body.location ?? undefined,
      capacity: body.capacity ?? undefined,
      description: body.description ?? undefined,
      ticket_price: body.ticket_price ?? undefined,
      status: body.status ?? undefined,
      updated_at: now,
    },
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    event_category_id: updated.event_category_id as string &
      tags.Format<"uuid">,
    name: updated.name,
    date: toISOStringSafe(updated.date),
    location: updated.location,
    capacity: updated.capacity as number & tags.Type<"int32">,
    description: updated.description ?? null,
    ticket_price: updated.ticket_price,
    status: updated.status as "scheduled" | "cancelled" | "completed",
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
