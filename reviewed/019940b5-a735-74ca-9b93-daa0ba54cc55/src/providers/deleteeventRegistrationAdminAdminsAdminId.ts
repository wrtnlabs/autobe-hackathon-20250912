import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Delete an administrator user by ID.
 *
 * This operation permanently removes the admin record from the database. It
 * requires an authenticated admin user performing the deletion.
 *
 * @param props - Object containing the authenticated admin and the adminId of
 *   the admin to delete
 * @param props.admin - The authenticated admin performing the deletion
 * @param props.adminId - UUID of the admin user to delete
 * @returns Void
 * @throws {Error} Throws if the admin to delete does not exist
 */
export async function deleteeventRegistrationAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, adminId } = props;

  // Confirm admin exists or throw (authorization checked by decorator)
  await MyGlobal.prisma.event_registration_admins.findUniqueOrThrow({
    where: { id: adminId },
  });

  // Perform hard delete
  await MyGlobal.prisma.event_registration_admins.delete({
    where: { id: adminId },
  });
}
