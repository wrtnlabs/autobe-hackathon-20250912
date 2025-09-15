import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventWaitlist";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an event waitlist entry
 *
 * This operation allows an admin to update fields of a waitlist entry for a
 * specific event. It modifies the event_id, regular_user_id, and timestamps
 * fields if provided.
 *
 * @param props - Object containing the admin payload, the event ID, the
 *   waitlist entry ID, and the body to update
 * @param props.admin - The authenticated admin performing the update
 * @param props.eventId - UUID of the event this waitlist entry belongs to
 * @param props.eventWaitlistId - UUID of the waitlist entry to update
 * @param props.body - Partial update data for the waitlist entry
 * @returns The updated waitlist entry record
 * @throws {Error} If the waitlist entry is not found or the update fails
 */
export async function puteventRegistrationAdminEventsEventIdWaitlistsEventWaitlistId(props: {
  admin: AdminPayload;
  eventId: string & tags.Format<"uuid">;
  eventWaitlistId: string & tags.Format<"uuid">;
  body: IEventRegistrationEventWaitlist.IUpdate;
}): Promise<IEventRegistrationEventWaitlist> {
  const { admin, eventId, eventWaitlistId, body } = props;

  const updated =
    await MyGlobal.prisma.event_registration_event_waitlists.update({
      where: {
        id: eventWaitlistId,
        event_id: eventId,
      },
      data: {
        event_id: body.event_id ?? undefined,
        regular_user_id: body.regular_user_id ?? undefined,
        created_at: body.created_at ?? undefined,
        updated_at: body.updated_at ?? undefined,
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
