import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventAttendee } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventAttendee";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves detailed information about an event attendee record for a specified
 * regular user.
 *
 * This operation is restricted to administrators with global privileges. It
 * fetches the attendee record by matching both the event attendee ID and the
 * regular user ID, ensuring proper access control.
 *
 * @param props - Object containing the admin payload, regular user ID, and
 *   event attendee ID.
 * @param props.admin - The authenticated admin user making the request.
 * @param props.regularUserId - The unique identifier of the regular user who
 *   owns the attendee record.
 * @param props.eventAttendeeId - The unique identifier of the event attendee
 *   record.
 * @returns The event attendee record conforming to
 *   IEventRegistrationEventAttendee.
 * @throws {Error} Throws if the attendee record is not found.
 */
export async function geteventRegistrationAdminRegularUsersRegularUserIdAttendeesEventAttendeeId(props: {
  admin: AdminPayload;
  regularUserId: string & tags.Format<"uuid">;
  eventAttendeeId: string & tags.Format<"uuid">;
}): Promise<IEventRegistrationEventAttendee> {
  const { admin, regularUserId, eventAttendeeId } = props;

  const attendee =
    await MyGlobal.prisma.event_registration_event_attendees.findFirstOrThrow({
      where: {
        id: eventAttendeeId,
        regular_user_id: regularUserId,
      },
    });

  return {
    id: attendee.id,
    event_id: attendee.event_id,
    regular_user_id: attendee.regular_user_id,
    created_at: toISOStringSafe(attendee.created_at),
    updated_at: toISOStringSafe(attendee.updated_at),
  };
}
