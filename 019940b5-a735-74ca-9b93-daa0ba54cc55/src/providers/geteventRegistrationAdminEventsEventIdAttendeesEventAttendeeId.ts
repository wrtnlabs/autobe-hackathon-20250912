import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventAttendee } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventAttendee";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves detailed information about an event attendee by their unique ID.
 *
 * This operation is restricted to authorized admins. It fetches a single
 * attendee record from the database, returning all relevant association data
 * with event and user.
 *
 * @param props - Object containing the admin payload and the eventAttendeeId
 *   UUID.
 * @param props.admin - Authorized admin performing the operation.
 * @param props.eventAttendeeId - UUID of the attendee record to retrieve.
 * @returns Detailed event attendee record matching the specified ID.
 * @throws {Error} Throws if no attendee record is found with the given ID.
 */
export async function geteventRegistrationAdminEventsEventIdAttendeesEventAttendeeId(props: {
  admin: AdminPayload;
  eventAttendeeId: string & tags.Format<"uuid">;
}): Promise<IEventRegistrationEventAttendee> {
  const { eventAttendeeId } = props;

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
