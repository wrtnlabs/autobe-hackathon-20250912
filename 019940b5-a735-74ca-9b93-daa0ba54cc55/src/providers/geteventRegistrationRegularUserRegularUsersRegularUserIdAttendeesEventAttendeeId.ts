import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventAttendee } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventAttendee";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Retrieves full details of a specific event attendee record for the given
 * regular user.
 *
 * Access control restricts viewing to the owning regular user.
 *
 * @param props - Object containing the authenticated regular user and
 *   identifying parameters
 * @param props.regularUser - The authenticated regular user making the request
 * @param props.regularUserId - UUID of the target regular user (must match the
 *   authenticated user)
 * @param props.eventAttendeeId - UUID of the event attendee record to retrieve
 * @returns The event attendee record with all fields including audit timestamps
 * @throws {Error} If the event attendee record does not exist
 * @throws {Error} If the authenticated user is not authorized to view this
 *   record
 */
export async function geteventRegistrationRegularUserRegularUsersRegularUserIdAttendeesEventAttendeeId(props: {
  regularUser: RegularuserPayload;
  regularUserId: string & tags.Format<"uuid">;
  eventAttendeeId: string & tags.Format<"uuid">;
}): Promise<IEventRegistrationEventAttendee> {
  const { regularUser, regularUserId, eventAttendeeId } = props;

  // Retrieve the event attendee record
  const attendee =
    await MyGlobal.prisma.event_registration_event_attendees.findUniqueOrThrow({
      where: { id: eventAttendeeId },
    });

  // Authorization: Allow only if the authenticated user owns the record
  if (attendee.regular_user_id !== regularUser.id) {
    throw new Error(
      "Unauthorized: You can only access your own event attendee records",
    );
  }

  // Return the attendee record with all date fields converted to ISO strings
  return {
    id: attendee.id,
    event_id: attendee.event_id,
    regular_user_id: attendee.regular_user_id,
    created_at: toISOStringSafe(attendee.created_at),
    updated_at: toISOStringSafe(attendee.updated_at),
  };
}
