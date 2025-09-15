import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventAttendee } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventAttendee";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Updates an event attendee record in the event_registration_event_attendees
 * table.
 *
 * This operation updates allowed fields such as event_id, regular_user_id,
 * created_at, and updated_at. Ensures the record exists and timestamps are
 * properly maintained.
 *
 * Authentication: Requires admin privileges.
 *
 * @param props - Object containing admin authentication, eventAttendeeId, and
 *   update body of type IEventRegistrationEventAttendee.IUpdate
 * @returns The updated event attendee record conforming to
 *   IEventRegistrationEventAttendee
 * @throws {Error} If the event attendee does not exist.
 */
export async function puteventRegistrationAdminEventAttendeesEventAttendeeId(props: {
  admin: AdminPayload;
  eventAttendeeId: string & tags.Format<"uuid">;
  body: IEventRegistrationEventAttendee.IUpdate;
}): Promise<IEventRegistrationEventAttendee> {
  const { admin, eventAttendeeId, body } = props;

  // Verify existence
  await MyGlobal.prisma.event_registration_event_attendees.findUniqueOrThrow({
    where: { id: eventAttendeeId },
  });

  // Prepare update data with proper null and date handling
  const updateData: {
    event_id?: string & tags.Format<"uuid">;
    regular_user_id?: string & tags.Format<"uuid">;
    created_at?: string & tags.Format<"date-time">;
    updated_at?: string & tags.Format<"date-time">;
  } = {};

  if (body.event_id !== undefined && body.event_id !== null) {
    updateData.event_id = body.event_id;
  }

  if (body.regular_user_id !== undefined && body.regular_user_id !== null) {
    updateData.regular_user_id = body.regular_user_id;
  }

  if (body.created_at !== undefined && body.created_at !== null) {
    updateData.created_at = toISOStringSafe(body.created_at);
  }

  if (body.updated_at !== undefined && body.updated_at !== null) {
    updateData.updated_at = toISOStringSafe(body.updated_at);
  }

  // Update record
  const updated =
    await MyGlobal.prisma.event_registration_event_attendees.update({
      where: { id: eventAttendeeId },
      data: updateData,
    });

  // Return updated record with dates converted
  return {
    id: updated.id,
    event_id: updated.event_id,
    regular_user_id: updated.regular_user_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
