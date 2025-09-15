import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventWaitlist";
import { EventOrganizerPayload } from "../decorators/payload/EventOrganizerPayload";

/**
 * Update an existing event waitlist entry identified by its unique ID.
 *
 * This operation allows authorized event organizers to modify the event or user
 * associations for a waitlist entry, as well as update audit timestamps. Only
 * authorized event organizers may perform this action.
 *
 * @param props - Object containing the authenticated event organizer, the ID of
 *   the event waitlist entry, and the update data.
 * @param props.eventOrganizer - The authenticated event organizer performing
 *   the update.
 * @param props.eventWaitlistId - The UUID of the event waitlist entry to
 *   update.
 * @param props.body - The partial update data for the waitlist entry.
 * @returns The updated event waitlist entry data.
 * @throws {Error} Throws if the specified waitlist entry does not exist.
 */
export async function puteventRegistrationEventOrganizerEventWaitlistsEventWaitlistId(props: {
  eventOrganizer: EventOrganizerPayload;
  eventWaitlistId: string & tags.Format<"uuid">;
  body: IEventRegistrationEventWaitlist.IUpdate;
}): Promise<IEventRegistrationEventWaitlist> {
  const { eventOrganizer, eventWaitlistId, body } = props;

  // Ensure the record exists
  await MyGlobal.prisma.event_registration_event_waitlists.findUniqueOrThrow({
    where: { id: eventWaitlistId },
  });

  // Prepare update data by including only defined properties
  const updateData: {
    event_id?: (string & tags.Format<"uuid">) | null;
    regular_user_id?: (string & tags.Format<"uuid">) | null;
    created_at?: (string & tags.Format<"date-time">) | null;
    updated_at?: (string & tags.Format<"date-time">) | null;
  } = {};

  if (body.event_id !== undefined) {
    updateData.event_id = body.event_id;
  }

  if (body.regular_user_id !== undefined) {
    updateData.regular_user_id = body.regular_user_id;
  }

  if (body.created_at !== undefined) {
    updateData.created_at = body.created_at;
  }

  if (body.updated_at !== undefined) {
    updateData.updated_at = body.updated_at;
  }

  const updated =
    await MyGlobal.prisma.event_registration_event_waitlists.update({
      where: { id: eventWaitlistId },
      data: updateData,
    });

  return {
    id: updated.id,
    event_id: updated.event_id,
    regular_user_id: updated.regular_user_id,
    created_at: updated.created_at,
    updated_at: updated.updated_at,
  };
}
