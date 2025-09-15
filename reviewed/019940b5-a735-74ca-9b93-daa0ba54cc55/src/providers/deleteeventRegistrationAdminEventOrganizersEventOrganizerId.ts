import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Delete an event organizer user permanently by UUID.
 *
 * This API operation permanently removes an event organizer user account
 * identified by a unique UUID. It requires admin privileges for authorization.
 * It throws if the event organizer does not exist.
 *
 * @param props - Object containing the admin payload and the target event
 *   organizer ID.
 * @param props.admin - The authenticated admin performing the deletion.
 * @param props.eventOrganizerId - Unique identifier of the event organizer to
 *   delete.
 * @returns A promise that resolves when deletion completes successfully.
 * @throws {Error} When the event organizer with the specified ID does not
 *   exist.
 */
export async function deleteeventRegistrationAdminEventOrganizersEventOrganizerId(props: {
  admin: AdminPayload;
  eventOrganizerId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, eventOrganizerId } = props;

  // Verify existence of the event organizer; throws if not found
  await MyGlobal.prisma.event_registration_event_organizers.findUniqueOrThrow({
    where: { id: eventOrganizerId },
  });

  // Perform hard delete
  await MyGlobal.prisma.event_registration_event_organizers.delete({
    where: { id: eventOrganizerId },
  });
}
