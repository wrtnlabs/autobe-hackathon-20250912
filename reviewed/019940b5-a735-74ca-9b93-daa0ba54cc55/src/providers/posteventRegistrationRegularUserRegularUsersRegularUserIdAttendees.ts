import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventAttendee } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventAttendee";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Registers a regular user as an attendee for a specific event.
 *
 * This operation creates a new attendee record in the database, associating the
 * user with the given event ID.
 *
 * @param props - The properties including the authenticated regular user, the
 *   target regular user ID, and the attendee creation data.
 * @param props.regularUser - The authenticated regular user making the request.
 * @param props.regularUserId - The UUID of the regular user to be registered to
 *   the event.
 * @param props.body - The creation data containing event_id and
 *   regular_user_id.
 * @returns The newly created event attendee record with timestamps and IDs.
 * @throws {Error} Throws if the database operation fails.
 */
export async function posteventRegistrationRegularUserRegularUsersRegularUserIdAttendees(props: {
  regularUser: RegularuserPayload;
  regularUserId: string & tags.Format<"uuid">;
  body: IEventRegistrationEventAttendee.ICreate;
}): Promise<IEventRegistrationEventAttendee> {
  const { regularUser, regularUserId, body } = props;

  // Current timestamp as ISO string with date-time tag
  const now = toISOStringSafe(new Date());

  // Create the attendee record in the database
  const created =
    await MyGlobal.prisma.event_registration_event_attendees.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        event_id: body.event_id,
        regular_user_id: body.regular_user_id,
        created_at: now,
        updated_at: now,
      },
    });

  // Return the created record, ensuring correct type formatting
  return {
    id: created.id as string & tags.Format<"uuid">,
    event_id: created.event_id as string & tags.Format<"uuid">,
    regular_user_id: created.regular_user_id as string & tags.Format<"uuid">,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
