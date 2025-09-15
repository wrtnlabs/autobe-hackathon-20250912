import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventWaitlist";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Updates an existing event waitlist entry.
 *
 * This operation allows an admin to modify the details of an event waitlist
 * entry, such as associated event, user, or audit timestamps.
 *
 * @param props - Object containing admin info, waitlist entry ID, and update
 *   data
 * @param props.admin - Authenticated admin performing the update
 * @param props.eventWaitlistId - UUID of the waitlist entry to update
 * @param props.body - Partial update data conforming to
 *   IEventRegistrationEventWaitlist.IUpdate
 * @returns The updated event waitlist entry data
 * @throws {Error} If the specified waitlist entry does not exist
 */
export async function puteventRegistrationAdminEventWaitlistsEventWaitlistId(props: {
  admin: AdminPayload;
  eventWaitlistId: string & tags.Format<"uuid">;
  body: IEventRegistrationEventWaitlist.IUpdate;
}): Promise<IEventRegistrationEventWaitlist> {
  const { admin, eventWaitlistId, body } = props;

  // Verify existence of the waitlist entry
  await MyGlobal.prisma.event_registration_event_waitlists.findUniqueOrThrow({
    where: { id: eventWaitlistId },
  });

  // Perform update with proper null and undefined handling
  const updated =
    await MyGlobal.prisma.event_registration_event_waitlists.update({
      where: { id: eventWaitlistId },
      data: {
        event_id: body.event_id !== undefined ? body.event_id : undefined,
        regular_user_id:
          body.regular_user_id !== undefined ? body.regular_user_id : undefined,
        created_at:
          body.created_at === null
            ? null
            : body.created_at !== undefined
              ? toISOStringSafe(body.created_at)
              : undefined,
        updated_at:
          body.updated_at === null
            ? null
            : body.updated_at !== undefined
              ? toISOStringSafe(body.updated_at)
              : undefined,
      },
    });

  // Return the updated record with date fields as branded strings
  return {
    id: updated.id,
    event_id: updated.event_id,
    regular_user_id: updated.regular_user_id,
    created_at: updated.created_at ? toISOStringSafe(updated.created_at) : null,
    updated_at: updated.updated_at ? toISOStringSafe(updated.updated_at) : null,
  };
}
