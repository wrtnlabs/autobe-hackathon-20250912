import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventAttendee } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventAttendee";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Add a regular user as an event attendee.
 *
 * Creates a new event attendee record linking the authenticated regular user to
 * the specified event. Enforces authorization ensuring the user can only
 * register themselves. Validates eventId matches the provided body.event_id.
 * Automatically generates a new UUID for the attendee and timestamps for audit
 * purposes.
 *
 * @param props - Object containing regularUser payload, eventId path param, and
 *   body with event_id and regular_user_id.
 * @param props.regularUser - The authenticated regular user.
 * @param props.eventId - UUID of the event to register for.
 * @param props.body - Request body containing event_id and regular_user_id.
 * @returns The newly created event attendee record.
 * @throws {Error} When the authenticated user is not the same as the attendee.
 * @throws {Error} When eventId path parameter does not match body.event_id.
 */
export async function posteventRegistrationRegularUserEventsEventIdAttendees(props: {
  regularUser: RegularuserPayload;
  eventId: string & tags.Format<"uuid">;
  body: IEventRegistrationEventAttendee.ICreate;
}): Promise<IEventRegistrationEventAttendee> {
  const { regularUser, eventId, body } = props;

  if (regularUser.id !== body.regular_user_id) {
    throw new Error(
      "Unauthorized: The regularUser may only register themselves.",
    );
  }
  if (eventId !== body.event_id) {
    throw new Error("eventId parameter and body.event_id must match.");
  }

  const now = toISOStringSafe(new Date());

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

  return {
    id: created.id as string & tags.Format<"uuid">,
    event_id: created.event_id as string & tags.Format<"uuid">,
    regular_user_id: created.regular_user_id as string & tags.Format<"uuid">,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
