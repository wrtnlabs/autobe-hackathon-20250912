import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventAttendee } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventAttendee";
import { EventOrganizerPayload } from "../decorators/payload/EventOrganizerPayload";

/**
 * Updates an existing event attendee record for a specific regular user.
 *
 * This function updates the attendee record identified by eventAttendeeId for
 * the user identified by regularUserId with the data in the provided update
 * body.
 *
 * Authorization is scoped to event organizers and admins verified via
 * eventOrganizer payload.
 *
 * @param props - The input parameters including authorization, path IDs, and
 *   update body
 * @param props.eventOrganizer - Authorized event organizer payload
 * @param props.regularUserId - UUID of the regular user linked to attendee
 *   record
 * @param props.eventAttendeeId - UUID of the event attendee record to update
 * @param props.body - Update data conforming to
 *   IEventRegistrationEventAttendee.IUpdate
 * @returns The updated event attendee record
 * @throws {Error} When the attendee record is not found or regularUserId
 *   mismatch
 */
export async function puteventRegistrationEventOrganizerRegularUsersRegularUserIdAttendeesEventAttendeeId(props: {
  eventOrganizer: EventOrganizerPayload;
  regularUserId: string & tags.Format<"uuid">;
  eventAttendeeId: string & tags.Format<"uuid">;
  body: IEventRegistrationEventAttendee.IUpdate;
}): Promise<IEventRegistrationEventAttendee> {
  const { eventOrganizer, regularUserId, eventAttendeeId, body } = props;

  // Find the event attendee record by id
  const attendee =
    await MyGlobal.prisma.event_registration_event_attendees.findUnique({
      where: { id: eventAttendeeId },
    });

  if (!attendee) {
    throw new Error("Event attendee not found");
  }

  if (attendee.regular_user_id !== regularUserId) {
    throw new Error("Regular user ID does not match the attendee record");
  }

  // Prepare the update data
  const updateData: IEventRegistrationEventAttendee.IUpdate = {};

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

  // Perform update
  const updated =
    await MyGlobal.prisma.event_registration_event_attendees.update({
      where: { id: eventAttendeeId },
      data: updateData,
    });

  // Return with correct date formatting
  return {
    id: updated.id,
    event_id: updated.event_id,
    regular_user_id: updated.regular_user_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
