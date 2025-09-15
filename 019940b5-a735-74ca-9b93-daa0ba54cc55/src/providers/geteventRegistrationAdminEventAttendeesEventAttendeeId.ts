import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventAttendee } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventAttendee";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve detailed information of a specific event attendee identified by
 * eventAttendeeId.
 *
 * This operation fetches the attendee record from the
 * event_registration_event_attendees table. It returns the attendee's unique
 * ID, associated event ID, regular user ID, and timestamps.
 *
 * Access is limited to admin users, and an error is thrown if the attendee
 * record is not found.
 *
 * @param props - Object containing the admin payload and the UUID of the event
 *   attendee
 * @param props.admin - Authenticated admin performing the retrieval
 * @param props.eventAttendeeId - UUID of the event attendee record
 * @returns The detailed event attendee information
 * @throws {Error} Throws if the attendee record does not exist
 */
export async function geteventRegistrationAdminEventAttendeesEventAttendeeId(props: {
  admin: AdminPayload;
  eventAttendeeId: string & tags.Format<"uuid">;
}): Promise<IEventRegistrationEventAttendee> {
  const { admin, eventAttendeeId } = props;

  const attendee =
    await MyGlobal.prisma.event_registration_event_attendees.findUniqueOrThrow({
      where: { id: eventAttendeeId },
    });

  return {
    id: attendee.id,
    event_id: attendee.event_id,
    regular_user_id: attendee.regular_user_id,
    created_at: toISOStringSafe(attendee.created_at),
    updated_at: toISOStringSafe(attendee.updated_at),
  };
}
