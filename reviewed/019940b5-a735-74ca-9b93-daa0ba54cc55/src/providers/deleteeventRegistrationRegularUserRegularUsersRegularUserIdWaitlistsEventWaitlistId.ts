import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Deletes a specific event waitlist entry for a given regular user.
 *
 * This operation permanently removes the waitlist record from the database.
 * Authorization ensures only the owner regular user can delete their own
 * waitlist entry.
 *
 * @param props - Object containing regularUser payload and identifying IDs
 * @param props.regularUser - The authenticated regular user payload
 * @param props.regularUserId - UUID of the regular user owner of the waitlist
 *   entry
 * @param props.eventWaitlistId - UUID of the waitlist entry to be deleted
 * @throws {Error} When the waitlist entry is not found
 * @throws {Error} When a user attempts to delete a waitlist entry they do not
 *   own
 */
export async function deleteeventRegistrationRegularUserRegularUsersRegularUserIdWaitlistsEventWaitlistId(props: {
  regularUser: RegularuserPayload;
  regularUserId: string & tags.Format<"uuid">;
  eventWaitlistId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { regularUser, regularUserId, eventWaitlistId } = props;

  const waitlistEntry =
    await MyGlobal.prisma.event_registration_event_waitlists.findUnique({
      where: { id: eventWaitlistId },
    });

  if (!waitlistEntry) throw new Error("Waitlist entry not found");

  if (waitlistEntry.regular_user_id !== regularUserId) {
    throw new Error("Forbidden: You can only delete your own waitlist entry");
  }

  await MyGlobal.prisma.event_registration_event_waitlists.delete({
    where: { id: eventWaitlistId },
  });
}
