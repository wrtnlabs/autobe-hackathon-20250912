import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Delete an organizer request (hard delete)
 *
 * Permanently deletes an organizer request identified by organizerRequestId.
 * Requires admin authorization.
 *
 * @param props - Object containing admin authentication and organizerRequestId
 * @param props.admin - The authenticated admin user performing the deletion
 * @param props.organizerRequestId - UUID of the organizer request to delete
 * @throws {Error} If the organizer request does not exist
 */
export async function deleteeventRegistrationAdminOrganizerRequestsOrganizerRequestId(props: {
  admin: AdminPayload;
  organizerRequestId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, organizerRequestId } = props;

  // Verify the organizer request exists or throw
  await MyGlobal.prisma.event_registration_organizer_requests.findUniqueOrThrow(
    {
      where: { id: organizerRequestId },
    },
  );

  // Permanently delete the organizer request
  await MyGlobal.prisma.event_registration_organizer_requests.delete({
    where: { id: organizerRequestId },
  });
}
