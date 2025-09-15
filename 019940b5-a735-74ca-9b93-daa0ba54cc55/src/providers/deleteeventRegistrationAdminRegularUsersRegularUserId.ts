import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Permanently deletes a regular user by their unique ID.
 *
 * This operation is restricted to administrators. It performs a hard delete on
 * the event_registration_regular_users table. Deletion cascades to related
 * entities such as email verification tokens, event signups, waitlists,
 * organizer requests, and notifications.
 *
 * @param props - The properties for deletion
 * @param props.admin - The administrator performing the deletion
 * @param props.regularUserId - The UUID of the regular user to be deleted
 * @throws {Error} Throws if the user does not exist
 * @throws {Error} Throws if the caller is not authorized (handled externally)
 */
export async function deleteeventRegistrationAdminRegularUsersRegularUserId(props: {
  admin: AdminPayload;
  regularUserId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, regularUserId } = props;

  // Authorization assumed verified by presence of admin payload

  // Verify user existence
  await MyGlobal.prisma.event_registration_regular_users.findUniqueOrThrow({
    where: { id: regularUserId },
  });

  // Delete user, cascade handled by database relations
  await MyGlobal.prisma.event_registration_regular_users.delete({
    where: { id: regularUserId },
  });
}
