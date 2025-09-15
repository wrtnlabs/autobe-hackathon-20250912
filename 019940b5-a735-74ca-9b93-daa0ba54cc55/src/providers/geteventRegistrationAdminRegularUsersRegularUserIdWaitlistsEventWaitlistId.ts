import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventWaitlist";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve detailed event waitlist entry for a regular user.
 *
 * Admins can use this endpoint to fetch full details about a specific event
 * waitlist entry belonging to a regular user, identified by regularUserId and
 * eventWaitlistId. This includes all relevant information such as event
 * association and timestamps.
 *
 * @param props - The function parameter object.
 * @param props.admin - Authenticated admin user payload.
 * @param props.regularUserId - UUID of the regular user associated with the
 *   waitlist record.
 * @param props.eventWaitlistId - UUID of the specific event waitlist entry.
 * @returns Detailed information of the event waitlist record.
 * @throws {Error} Throws if the waitlist record is not found.
 */
export async function geteventRegistrationAdminRegularUsersRegularUserIdWaitlistsEventWaitlistId(props: {
  admin: AdminPayload;
  regularUserId: string & tags.Format<"uuid">;
  eventWaitlistId: string & tags.Format<"uuid">;
}): Promise<IEventRegistrationEventWaitlist> {
  const { admin, regularUserId, eventWaitlistId } = props;

  // Fetch event waitlist entry ensuring it belongs to the regular user
  const waitlistEntry =
    await MyGlobal.prisma.event_registration_event_waitlists.findUniqueOrThrow({
      where: {
        id: eventWaitlistId,
        regular_user_id: regularUserId,
      },
      select: {
        id: true,
        event_id: true,
        regular_user_id: true,
        created_at: true,
        updated_at: true,
      },
    });

  // Return converted entity matching IEventRegistrationEventWaitlist interface
  return {
    id: waitlistEntry.id,
    event_id: waitlistEntry.event_id,
    regular_user_id: waitlistEntry.regular_user_id,
    created_at: toISOStringSafe(waitlistEntry.created_at),
    updated_at: toISOStringSafe(waitlistEntry.updated_at),
  };
}
