import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Permanently deletes an event attendee record for a specified regular user.
 *
 * This operation removes the confirmed attendance record from the database,
 * reflecting cancellations or deregistrations. Only users with admin role are
 * authorized to perform this operation.
 *
 * @param props - Object containing the authenticated admin user, regular user
 *   ID, and the event attendee ID
 * @param props.admin - The authenticated admin performing the deletion
 * @param props.regularUserId - UUID of the regular user who is attending
 * @param props.eventAttendeeId - UUID of the event attendee record to delete
 * @throws {Error} If the event attendee record does not exist
 * @throws {Error} If the authenticated admin is not authorized to delete the
 *   record
 */
export async function deleteeventRegistrationAdminRegularUsersRegularUserIdAttendeesEventAttendeeId(props: {
  admin: AdminPayload;
  regularUserId: string & tags.Format<"uuid">;
  eventAttendeeId: string & tags.Format<"uuid">;
}): Promise<void> {
  const attendee =
    await MyGlobal.prisma.event_registration_event_attendees.findUniqueOrThrow({
      where: { id: props.eventAttendeeId },
    });

  if (attendee.regular_user_id !== props.regularUserId) {
    throw new Error(
      "Unauthorized: The event attendee does not belong to the specified regular user",
    );
  }

  await MyGlobal.prisma.event_registration_event_attendees.delete({
    where: { id: props.eventAttendeeId },
  });
}
