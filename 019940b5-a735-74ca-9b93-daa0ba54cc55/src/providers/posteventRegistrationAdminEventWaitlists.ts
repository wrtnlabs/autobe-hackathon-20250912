import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventWaitlist";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new event waitlist entry linking a regular user to an event
 * waitlist.
 *
 * This operation creates an entry representing a user waiting for an event
 * spot, while enforcing no duplicate waitlist or registration exists.
 *
 * Only admin users can perform this operation.
 *
 * @param props - Object containing admin authentication and waitlist creation
 *   data
 * @param props.admin - Authenticated admin user performing the creation
 * @param props.body - Data containing event_id and regular_user_id to be
 *   waitlisted
 * @returns The created event waitlist entry with timestamps
 * @throws {Error} When the user is already on the waitlist for the event
 * @throws {Error} When the user is already registered as an attendee for the
 *   event
 */
export async function posteventRegistrationAdminEventWaitlists(props: {
  admin: AdminPayload;
  body: IEventRegistrationEventWaitlist.ICreate;
}): Promise<IEventRegistrationEventWaitlist> {
  const { admin, body } = props;

  // Verify user not already on waitlist
  const existingWaitlist =
    await MyGlobal.prisma.event_registration_event_waitlists.findFirst({
      where: {
        event_id: body.event_id,
        regular_user_id: body.regular_user_id,
      },
    });
  if (existingWaitlist) {
    throw new Error("User is already on the waitlist for this event.");
  }

  // Verify user is not registered as attendee
  const existingAttendee =
    await MyGlobal.prisma.event_registration_event_attendees.findFirst({
      where: {
        event_id: body.event_id,
        regular_user_id: body.regular_user_id,
      },
    });
  if (existingAttendee) {
    throw new Error(
      "User is already registered as an attendee for this event.",
    );
  }

  // Create waitlist entry
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.event_registration_event_waitlists.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        event_id: body.event_id,
        regular_user_id: body.regular_user_id,
        created_at: now,
        updated_at: now,
      },
    });

  return {
    id: created.id,
    event_id: created.event_id,
    regular_user_id: created.regular_user_id,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
