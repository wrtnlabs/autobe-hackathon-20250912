import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventAttendee } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventAttendee";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Register a user as an event attendee.
 *
 * This inserts a new record into event_registration_event_attendees linking the
 * regular user to the event.
 *
 * Preconditions:
 *
 * - The user must have verified their email.
 * - The event must be scheduled, not deleted, and have available capacity.
 *
 * @param props - Object containing regularUser payload and attendee creation
 *   data
 * @param props.regularUser - Authenticated regular user payload
 * @param props.body - Data required to create the event attendee record
 * @returns The created event attendee record
 * @throws {Error} When the user email is not verified
 * @throws {Error} When the event is not scheduled or is deleted
 * @throws {Error} When the event capacity is already full
 */
export async function posteventRegistrationRegularUserEventAttendees(props: {
  regularUser: RegularuserPayload;
  body: IEventRegistrationEventAttendee.ICreate;
}): Promise<IEventRegistrationEventAttendee> {
  const { regularUser, body } = props;

  // Helper to generate UUID with proper branding
  function generateUuid(): string & tags.Format<"uuid"> {
    const id = v4();
    typia.assertGuard<string & tags.Format<"uuid">>(id);
    return id;
  }

  // Check if user exists and email is verified
  const user =
    await MyGlobal.prisma.event_registration_regular_users.findUniqueOrThrow({
      where: { id: regularUser.id },
      select: { email_verified: true },
    });

  if (!user.email_verified) {
    throw new Error("User email not verified");
  }

  // Check event existence and status
  const event =
    await MyGlobal.prisma.event_registration_events.findUniqueOrThrow({
      where: { id: body.event_id },
      select: { capacity: true, status: true, deleted_at: true },
    });

  if (event.status !== "scheduled") {
    throw new Error("Event is not scheduled");
  }

  if (event.deleted_at !== null) {
    throw new Error("Event is deleted");
  }

  // Count current attendees
  const attendeesCount =
    await MyGlobal.prisma.event_registration_event_attendees.count({
      where: { event_id: body.event_id },
    });

  if (attendeesCount >= event.capacity) {
    throw new Error("Event capacity reached");
  }

  // Create the attendee record
  const now = toISOStringSafe(new Date());
  const attendee =
    await MyGlobal.prisma.event_registration_event_attendees.create({
      data: {
        id: generateUuid(),
        event_id: body.event_id,
        regular_user_id: body.regular_user_id,
        created_at: now,
        updated_at: now,
      },
    });

  // Return the created attendee
  return {
    id: attendee.id,
    event_id: attendee.event_id,
    regular_user_id: attendee.regular_user_id,
    created_at: attendee.created_at,
    updated_at: attendee.updated_at,
  };
}
