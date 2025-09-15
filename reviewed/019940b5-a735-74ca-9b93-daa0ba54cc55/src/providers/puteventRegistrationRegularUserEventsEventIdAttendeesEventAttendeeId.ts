import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventAttendee } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventAttendee";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Updates an existing event attendee record identified by eventAttendeeId
 * within a specific event identified by eventId.
 *
 * Enforces authorization to ensure only the owner (regularUser) can update
 * their attendance. Validates the event association before applying updates.
 * Performs partial update based on provided fields, with correct null and
 * undefined handling.
 *
 * @param props - Object containing the authenticated regularUser, eventId,
 *   eventAttendeeId, and update body.
 * @returns The updated event attendee record after successful update.
 * @throws {Error} When the attendee does not belong to the specified event.
 * @throws {Error} When the user is not authorized to update this attendance
 *   record.
 */
export async function puteventRegistrationRegularUserEventsEventIdAttendeesEventAttendeeId(props: {
  regularUser: RegularuserPayload;
  eventId: string & tags.Format<"uuid">;
  eventAttendeeId: string & tags.Format<"uuid">;
  body: IEventRegistrationEventAttendee.IUpdate;
}): Promise<IEventRegistrationEventAttendee> {
  const { regularUser, eventId, eventAttendeeId, body } = props;

  // Fetch existing attendee record
  const attendee =
    await MyGlobal.prisma.event_registration_event_attendees.findUniqueOrThrow({
      where: { id: eventAttendeeId },
    });

  // Authorization check - user must be owner
  if (attendee.regular_user_id !== regularUser.id) {
    throw new Error(
      "Unauthorized: You can only update your own attendance record.",
    );
  }

  // Validate attendee belongs to correct event
  if (attendee.event_id !== eventId) {
    throw new Error(
      "Event ID mismatch: Attendee does not belong to the specified event.",
    );
  }

  // Prepare update data inline to respect undefined and null
  const updated =
    await MyGlobal.prisma.event_registration_event_attendees.update({
      where: { id: eventAttendeeId },
      data: {
        ...(body.event_id !== undefined && { event_id: body.event_id }),
        ...(body.regular_user_id !== undefined && {
          regular_user_id: body.regular_user_id,
        }),
        ...(body.created_at !== undefined && { created_at: body.created_at }),
        ...(body.updated_at !== undefined && { updated_at: body.updated_at }),
      },
    });

  // Return updated record transforming dates to ISO string with correct branding
  return {
    id: updated.id as string & tags.Format<"uuid">,
    event_id: updated.event_id as string & tags.Format<"uuid">,
    regular_user_id: updated.regular_user_id as string & tags.Format<"uuid">,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
