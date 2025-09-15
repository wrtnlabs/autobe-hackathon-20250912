import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEvent";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Creates a new event record in the database.
 *
 * This operation requires 'admin' role authorization. It uses the provided
 * event creation payload to persist a new event.
 *
 * @param props - Object containing the admin credentials and the event data to
 *   create
 * @param props.admin - Authenticated admin making the request
 * @param props.body - Event creation data conforming to
 *   IEventRegistrationEvent.ICreate
 * @returns The newly created event object with all relevant properties
 * @throws {Error} If the creation fails due to database errors or invalid data
 */
export async function posteventRegistrationAdminEvents(props: {
  admin: AdminPayload;
  body: IEventRegistrationEvent.ICreate;
}): Promise<IEventRegistrationEvent> {
  const { admin, body } = props;

  // Authorization handled externally by decorator

  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.event_registration_events.create({
    data: {
      id,
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
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    event_category_id: created.event_category_id as string &
      tags.Format<"uuid">,
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
