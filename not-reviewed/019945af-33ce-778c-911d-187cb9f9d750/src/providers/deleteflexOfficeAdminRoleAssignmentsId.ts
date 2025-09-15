import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft delete a role assignment by its unique ID.
 *
 * This operation marks the record as deleted by setting the 'deleted_at'
 * timestamp, thus removing the role assignment without permanent data loss.
 *
 * Only administrators are authorized to perform this action to maintain system
 * security and access control integrity.
 *
 * @param props - Object containing the admin user and the ID of the role
 *   assignment to delete
 * @param props.admin - The authenticated admin performing the deletion
 * @param props.id - The UUID of the role assignment to be soft deleted
 * @throws {Error} Throws if the role assignment does not exist or is already
 *   deleted
 */
export async function deleteflexOfficeAdminRoleAssignmentsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, id } = props;

  // Verify the role assignment exists and is not already deleted
  const record =
    await MyGlobal.prisma.flex_office_role_assignments.findUniqueOrThrow({
      where: { id },
      select: { id: true, deleted_at: true },
    });

  if (record.deleted_at !== null) {
    throw new Error("Role assignment already deleted");
  }

  // Perform soft deletion by setting deleted_at to current ISO timestamp
  await MyGlobal.prisma.flex_office_role_assignments.update({
    where: { id },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
