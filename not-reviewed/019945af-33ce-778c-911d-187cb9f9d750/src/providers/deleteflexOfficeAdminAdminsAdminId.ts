import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Permanently delete an Admin user by ID
 *
 * This endpoint permanently removes an admin user identified by adminId from
 * the flex_office_admins table. Only authorized admin users can perform this
 * operation. The deletion is hard, irreversible, and removes all related data.
 *
 * @param props - Object containing admin authentication payload and the target
 *   adminId to delete
 * @param props.admin - The authenticated admin performing the deletion
 * @param props.adminId - UUID of the admin user to delete
 * @throws {Error} Throws if the admin with the specified adminId does not exist
 */
export async function deleteflexOfficeAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, adminId } = props;

  // Confirm the admin user exists
  await MyGlobal.prisma.flex_office_admins.findUniqueOrThrow({
    where: { id: adminId },
  });

  // Hard delete the admin user
  await MyGlobal.prisma.flex_office_admins.delete({
    where: { id: adminId },
  });

  return;
}
