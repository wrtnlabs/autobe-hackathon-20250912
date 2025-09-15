import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventWaitlist";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Add a user to event waitlist
 *
 * This operation allows an admin to add a regular user to the waitlist for a
 * specific event.
 *
 * @param props - The admin payload, event identifier, and waitlist creation
 *   data
 * @returns The created event waitlist entry with timestamps
 * @throws {Error} When Prisma create operation fails
 */
export async function posteventRegistrationAdminEventsEventIdWaitlists(props: {
  admin: AdminPayload;
  eventId: string & tags.Format<"uuid">;
  body: IEventRegistrationEventWaitlist.ICreate;
}): Promise<IEventRegistrationEventWaitlist> {
  const { admin, eventId, body } = props;

  const created =
    await MyGlobal.prisma.event_registration_event_waitlists.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        event_id: body.event_id,
        regular_user_id: body.regular_user_id,
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
