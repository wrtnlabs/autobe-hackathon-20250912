import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventWaitlist";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve specific waitlist entry details.
 *
 * This operation fetches a detailed information record of an event waitlist
 * entry by its unique 'eventWaitlistId' for the associated event identified by
 * 'eventId'. Access is restricted to users with 'admin' role via
 * authorization.
 *
 * @param props - Object containing authorization and identifying parameters
 * @param props.admin - The authenticated admin user making the request
 * @param props.eventId - UUID of the associated event
 * @param props.eventWaitlistId - UUID of the specific waitlist entry
 * @returns A promise resolving to the detailed waitlist entry data
 * @throws {Error} When the waitlist entry does not exist or eventId mismatch
 *   occurs
 * @throws {Error} When authorization fails due to event ID mismatch
 */
export async function geteventRegistrationAdminEventsEventIdWaitlistsEventWaitlistId(props: {
  admin: AdminPayload;
  eventId: string & tags.Format<"uuid">;
  eventWaitlistId: string & tags.Format<"uuid">;
}): Promise<IEventRegistrationEventWaitlist> {
  const { admin, eventId, eventWaitlistId } = props;

  const waitlistEntry =
    await MyGlobal.prisma.event_registration_event_waitlists.findUniqueOrThrow({
      where: { id: eventWaitlistId },
    });

  if (waitlistEntry.event_id !== eventId) {
    throw new Error("Unauthorized: event ID mismatch");
  }

  return {
    id: waitlistEntry.id,
    event_id: waitlistEntry.event_id,
    regular_user_id: waitlistEntry.regular_user_id,
    created_at: toISOStringSafe(waitlistEntry.created_at),
    updated_at: toISOStringSafe(waitlistEntry.updated_at),
  };
}
