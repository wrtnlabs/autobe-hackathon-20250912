import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Deletes an event attendee record for the authenticated regular user.
 *
 * This operation performs a hard delete on the attendee record identified by
 * eventAttendeeId within the specified event. It ensures the authenticated
 * regular user owns the attendee record and that the attendee belongs to the
 * specified event.
 *
 * @param props - Object containing the regularUser payload, eventId, and
 *   eventAttendeeId
 * @param props.regularUser - Authenticated regular user making the request
 * @param props.eventId - The unique identifier (UUID) of the event
 * @param props.eventAttendeeId - The unique identifier (UUID) of the event
 *   attendee record to delete
 * @throws {Error} Throws if the attendee is not found, if eventId does not
 *   match, or if the user is unauthorized
 */
export async function deleteeventRegistrationRegularUserEventsEventIdAttendeesEventAttendeeId(props: {
  regularUser: RegularuserPayload;
  eventId: string & tags.Format<"uuid">;
  eventAttendeeId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { regularUser, eventId, eventAttendeeId } = props;

  // Retrieve the event attendee record by its unique ID
  const attendee =
    await MyGlobal.prisma.event_registration_event_attendees.findUniqueOrThrow({
      where: { id: eventAttendeeId },
    });

  // Verify that the attendee belongs to the specified event
  if (attendee.event_id !== eventId) {
    throw new Error("Event ID mismatch");
  }

  // Verify that the attendee record belongs to the authenticated regular user
  if (attendee.regular_user_id !== regularUser.id) {
    throw new Error("Unauthorized: You can only delete your own attendance");
  }

  // Perform hard delete of the attendee record
  await MyGlobal.prisma.event_registration_event_attendees.delete({
    where: { id: eventAttendeeId },
  });
}
