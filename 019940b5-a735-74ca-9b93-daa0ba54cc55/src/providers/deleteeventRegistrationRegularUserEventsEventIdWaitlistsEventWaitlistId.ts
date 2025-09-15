import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Deletes a waitlist entry by eventId and eventWaitlistId for the authenticated
 * regular user.
 *
 * This operation permanently removes the specified waitlist record from the
 * event_registration_event_waitlists table. It ensures only the owner of the
 * waitlist entry (the regular user) can delete their own entry.
 *
 * @param props - Object containing the authenticated regular user, event ID,
 *   and waitlist entry ID.
 * @param props.regularUser - The authenticated regular user performing the
 *   deletion.
 * @param props.eventId - UUID of the event associated with the waitlist entry.
 * @param props.eventWaitlistId - UUID of the waitlist entry to be deleted.
 * @throws {Error} When the waitlist entry does not exist.
 * @throws {Error} When the regular user is not authorized to delete this
 *   waitlist entry.
 */
export async function deleteeventRegistrationRegularUserEventsEventIdWaitlistsEventWaitlistId(props: {
  regularUser: RegularuserPayload;
  eventId: string & tags.Format<"uuid">;
  eventWaitlistId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { regularUser, eventId, eventWaitlistId } = props;

  const waitlistEntry =
    await MyGlobal.prisma.event_registration_event_waitlists.findFirstOrThrow({
      where: {
        id: eventWaitlistId,
        event_id: eventId,
      },
    });

  if (waitlistEntry.regular_user_id !== regularUser.id) {
    throw new Error("Unauthorized: cannot delete others' waitlist entries");
  }

  await MyGlobal.prisma.event_registration_event_waitlists.delete({
    where: { id: eventWaitlistId },
  });
}
