import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventAttendee } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventAttendee";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Updates an event attendee record for a specified regular user.
 *
 * This operation allows a regular user to update their confirmed attendance
 * details such as timestamps or related fields within the attendee record. It
 * validates ownership before applying changes.
 *
 * @param props - Object containing the regular user payload, user ID, attendee
 *   ID, and update data
 * @param props.regularUser - The authenticated regular user making the request
 * @param props.regularUserId - UUID of the regular user to authorize ownership
 * @param props.eventAttendeeId - UUID of the event attendee record to update
 * @param props.body - Partial update data conforming to
 *   IEventRegistrationEventAttendee.IUpdate
 * @returns Updated event attendee record
 * @throws {Error} If the attendee record does not exist
 * @throws {Error} If the regular user does not own the attendee record
 */
export async function puteventRegistrationRegularUserRegularUsersRegularUserIdAttendeesEventAttendeeId(props: {
  regularUser: RegularuserPayload;
  regularUserId: string & tags.Format<"uuid">;
  eventAttendeeId: string & tags.Format<"uuid">;
  body: IEventRegistrationEventAttendee.IUpdate;
}): Promise<IEventRegistrationEventAttendee> {
  const { regularUser, regularUserId, eventAttendeeId, body } = props;

  const attendee =
    await MyGlobal.prisma.event_registration_event_attendees.findUnique({
      where: { id: eventAttendeeId },
    });

  if (!attendee) throw new Error("Event attendee record not found");

  if (attendee.regular_user_id !== regularUserId) {
    throw new Error(
      "Unauthorized: User can only update their own attendee records",
    );
  }

  const updates = {
    event_id: body.event_id === null ? null : (body.event_id ?? undefined),
    regular_user_id:
      body.regular_user_id === null
        ? null
        : (body.regular_user_id ?? undefined),
    created_at:
      body.created_at === null ? null : (body.created_at ?? undefined),
    updated_at:
      body.updated_at === null ? null : (body.updated_at ?? undefined),
  };

  const updated =
    await MyGlobal.prisma.event_registration_event_attendees.update({
      where: { id: eventAttendeeId },
      data: updates,
    });

  return {
    id: updated.id,
    event_id: updated.event_id as string & tags.Format<"uuid">,
    regular_user_id: updated.regular_user_id as string & tags.Format<"uuid">,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
