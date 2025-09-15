import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Permanently deletes an event attendee record for a specified regular user.
 *
 * This operation removes the attendance record uniquely identified by
 * regularUserId and eventAttendeeId from the event_registration_event_attendees
 * table. It enforces strict authorization by ensuring the requester owns the
 * record.
 *
 * No soft deletion is performed because the schema lacks a soft-delete field.
 *
 * @param props - Object containing the authenticated regular user, the user's
 *   UUID, and the attendee record UUID.
 * @param props.regularUser - The authenticated regular user performing the
 *   deletion.
 * @param props.regularUserId - UUID of the regular user who owns the attendance
 *   record.
 * @param props.eventAttendeeId - UUID of the event attendance record to delete.
 * @throws {Error} Throws an error if the attendance record does not exist or
 *   does not belong to the user.
 */
export async function deleteeventRegistrationRegularUserRegularUsersRegularUserIdAttendeesEventAttendeeId(props: {
  regularUser: RegularuserPayload;
  regularUserId: string & tags.Format<"uuid">;
  eventAttendeeId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { regularUser, regularUserId, eventAttendeeId } = props;

  const attendee =
    await MyGlobal.prisma.event_registration_event_attendees.findFirst({
      where: {
        id: eventAttendeeId,
        regular_user_id: regularUserId,
      },
    });

  if (!attendee) {
    throw new Error("Event attendee record not found or unauthorized");
  }

  await MyGlobal.prisma.event_registration_event_attendees.delete({
    where: { id: eventAttendeeId },
  });
}
