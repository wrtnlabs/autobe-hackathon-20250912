import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventAttendee } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventAttendee";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new event attendee record for a specific regular user.
 *
 * This operation registers a user as an attendee for an event by creating a new
 * entry in the event_registration_event_attendees table. It uses the path
 * parameter for the regular user ID to ensure authorization and identity
 * consistency.
 *
 * @param props - Object containing admin authenticaton info, regular user ID
 *   path param, and body with creation data.
 * @param props.admin - The authenticated admin performing the operation.
 * @param props.regularUserId - UUID of the regular user to register.
 * @param props.body - Creation info including event_id to associate attendee.
 * @returns The created event attendee record with detailed fields and
 *   timestamps.
 * @throws {Error} Throws on any database or authorization error.
 */
export async function posteventRegistrationAdminRegularUsersRegularUserIdAttendees(props: {
  admin: AdminPayload;
  regularUserId: string & tags.Format<"uuid">;
  body: IEventRegistrationEventAttendee.ICreate;
}): Promise<IEventRegistrationEventAttendee> {
  const { admin, regularUserId, body } = props;

  const now = toISOStringSafe(new Date());

  const created =
    await MyGlobal.prisma.event_registration_event_attendees.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        event_id: body.event_id,
        regular_user_id: regularUserId,
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
