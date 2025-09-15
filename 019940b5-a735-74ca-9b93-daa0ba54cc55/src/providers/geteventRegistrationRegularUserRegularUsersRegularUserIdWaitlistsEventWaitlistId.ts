import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventWaitlist";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Retrieve detailed event waitlist entry for a regular user
 *
 * This operation fetches a single record from the
 * event_registration_event_waitlists table identified by eventWaitlistId and
 * regularUserId, ensuring the record belongs to the given regular user. It
 * returns the full waitlist entry details.
 *
 * @param props - Object containing required parameters
 * @param props.regularUser - Authenticated regular user payload
 * @param props.regularUserId - UUID of the regular user
 * @param props.eventWaitlistId - UUID of the event waitlist record
 * @returns Detailed waitlist entry matching the user and waitlist ID
 * @throws {Error} If no matching waitlist entry is found
 */
export async function geteventRegistrationRegularUserRegularUsersRegularUserIdWaitlistsEventWaitlistId(props: {
  regularUser: RegularuserPayload;
  regularUserId: string & tags.Format<"uuid">;
  eventWaitlistId: string & tags.Format<"uuid">;
}): Promise<IEventRegistrationEventWaitlist> {
  const { regularUser, regularUserId, eventWaitlistId } = props;

  const waitlist =
    await MyGlobal.prisma.event_registration_event_waitlists.findFirstOrThrow({
      where: {
        id: eventWaitlistId,
        regular_user_id: regularUserId,
      },
    });

  return {
    id: waitlist.id,
    event_id: waitlist.event_id,
    regular_user_id: waitlist.regular_user_id,
    created_at: toISOStringSafe(waitlist.created_at),
    updated_at: toISOStringSafe(waitlist.updated_at),
  };
}
