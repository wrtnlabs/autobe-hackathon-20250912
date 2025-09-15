import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Deletes an event attendee registration by its unique ID.
 *
 * This operation performs a permanent hard deletion of the attendee
 * registration record. Only the regular user who owns the registration is
 * authorized to delete.
 *
 * @param props - Object containing the authenticated regular user and the event
 *   attendee ID to delete
 * @param props.regularUser - The authenticated regular user payload performing
 *   the deletion
 * @param props.eventAttendeeId - The unique UUID of the event attendee
 *   registration record
 * @throws {Error} Throws an error if the attendee record does not exist or if
 *   the user is unauthorized
 */
export async function deleteeventRegistrationRegularUserEventAttendeesEventAttendeeId(props: {
  regularUser: RegularuserPayload;
  eventAttendeeId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { regularUser, eventAttendeeId } = props;

  // Retrieve the event attendee registration to enforce ownership
  const attendee =
    await MyGlobal.prisma.event_registration_event_attendees.findUniqueOrThrow({
      where: { id: eventAttendeeId },
    });

  // Verify that the authenticated user owns this attendee registration
  if (attendee.regular_user_id !== regularUser.id) {
    throw new Error(
      "Unauthorized: You can only delete your own event attendee registration.",
    );
  }

  // Execute hard deletion
  await MyGlobal.prisma.event_registration_event_attendees.delete({
    where: { id: eventAttendeeId },
  });
}
