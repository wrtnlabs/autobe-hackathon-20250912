import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Delete an event attendee registration by ID.
 *
 * This operation performs a permanent hard delete of the attendee record from
 * the event_registration_event_attendees table.
 *
 * Authorization: Admins are allowed to delete any attendee record.
 *
 * @param props - The input properties for this operation
 * @param props.admin - The authenticated admin user performing deletion
 * @param props.eventAttendeeId - The UUID of the event attendee registration to
 *   delete
 * @throws {Error} Throws if the event attendee registration with provided ID
 *   does not exist
 */
export async function deleteeventRegistrationAdminEventAttendeesEventAttendeeId(props: {
  admin: AdminPayload;
  eventAttendeeId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, eventAttendeeId } = props;

  // Verify the event attendee exists; will throw if not found
  await MyGlobal.prisma.event_registration_event_attendees.findUniqueOrThrow({
    where: { id: eventAttendeeId },
  });

  // Perform hard delete
  await MyGlobal.prisma.event_registration_event_attendees.delete({
    where: { id: eventAttendeeId },
  });
}
