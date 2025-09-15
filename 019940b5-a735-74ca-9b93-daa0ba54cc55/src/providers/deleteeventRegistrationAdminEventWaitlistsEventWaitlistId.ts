import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Remove an event waitlist entry by its unique ID.
 *
 * This operation permanently deletes the specified waitlist entry from the
 * event_registration_event_waitlists table. Only an authenticated admin user
 * can perform this deletion.
 *
 * @param props - Object containing the admin user's payload and the event
 *   waitlist ID
 * @param props.admin - Authenticated admin user performing the deletion
 * @param props.eventWaitlistId - UUID of the event waitlist entry to delete
 * @returns Void
 * @throws {Error} Throws if the waitlist entry does not exist or deletion fails
 */
export async function deleteeventRegistrationAdminEventWaitlistsEventWaitlistId(props: {
  admin: AdminPayload;
  eventWaitlistId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.event_registration_event_waitlists.delete({
    where: {
      id: props.eventWaitlistId,
    },
  });
}
