import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Delete an event by its unique eventId.
 *
 * This operation permanently removes the event and cannot be undone. Only users
 * with the admin role may delete events.
 *
 * @param props - Object containing admin authentication payload and eventId.
 * @param props.admin - The authenticated admin performing the deletion.
 * @param props.eventId - UUID of the event to delete.
 * @returns Void
 * @throws {Error} Throws an error if the event does not exist.
 */
export async function deleteeventRegistrationAdminEventsEventId(props: {
  admin: AdminPayload;
  eventId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, eventId } = props;

  // Authorization is enforced by existence and role of admin (assumed guaranteed)

  // Verify event existence
  await MyGlobal.prisma.event_registration_events.findUniqueOrThrow({
    where: { id: eventId },
    select: { id: true },
  });

  // Perform hard delete of the event
  await MyGlobal.prisma.event_registration_events.delete({
    where: { id: eventId },
  });
}
