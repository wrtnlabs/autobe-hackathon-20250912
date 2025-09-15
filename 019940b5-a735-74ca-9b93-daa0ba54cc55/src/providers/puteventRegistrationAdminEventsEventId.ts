import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEvent";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing event identified by eventId with new property values
 * including category, name, date, location, capacity, optional description,
 * ticket price, and status.
 *
 * Only admins may update events.
 *
 * Validations ensure updated capacity remains positive, status is one of
 * scheduled, cancelled, or completed, and eventCategory exists. The updated_at
 * timestamp is refreshed.
 *
 * @param props - Object containing admin payload, eventId and update data body.
 * @returns The updated event record.
 * @throws {Error} When event or category not found, or validation fails.
 */
export async function puteventRegistrationAdminEventsEventId(props: {
  admin: AdminPayload;
  eventId: string & tags.Format<"uuid">;
  body: IEventRegistrationEvent.IUpdate;
}): Promise<IEventRegistrationEvent> {
  const { admin, eventId, body } = props;

  const event = await MyGlobal.prisma.event_registration_events.findUnique({
    where: { id: eventId },
  });
  if (!event) throw new Error(`Event with id ${eventId} not found`);

  if (body.capacity !== undefined && body.capacity !== null) {
    if (!Number.isInteger(body.capacity) || body.capacity <= 0) {
      throw new Error("Capacity must be a positive integer");
    }
  }

  const validStatuses = ["scheduled", "cancelled", "completed"] as const;
  if (body.status !== undefined && body.status !== null) {
    if (!validStatuses.includes(body.status)) {
      throw new Error(`Status must be one of: ${validStatuses.join(", ")}`);
    }
  }

  if (body.event_category_id !== undefined && body.event_category_id !== null) {
    const category =
      await MyGlobal.prisma.event_registration_event_categories.findUnique({
        where: { id: body.event_category_id },
      });
    if (!category)
      throw new Error(`Event category ${body.event_category_id} not found`);
  }

  const now = toISOStringSafe(new Date());

  const updateData: IEventRegistrationEvent.IUpdate = {
    event_category_id: body.event_category_id ?? undefined,
    name: body.name ?? undefined,
    date: body.date ?? undefined,
    location: body.location ?? undefined,
    capacity: body.capacity ?? undefined,
    description: body.description ?? undefined,
    ticket_price: body.ticket_price ?? undefined,
    status: body.status ?? undefined,
  };

  const updated = await MyGlobal.prisma.event_registration_events.update({
    where: { id: eventId },
    data: {
      ...updateData,
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
    capacity: updated.capacity,
    description: updated.description ?? null,
    ticket_price: updated.ticket_price,
    status: updated.status as "scheduled" | "cancelled" | "completed",
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
