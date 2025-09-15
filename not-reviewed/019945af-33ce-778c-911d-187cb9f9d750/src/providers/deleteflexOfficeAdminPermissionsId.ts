import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Deletes a permission by ID from flex_office_permissions table.
 *
 * This operation performs a soft delete by setting the deleted_at timestamp. It
 * requires admin authorization, provided in the props.
 *
 * @param props - Object containing admin authentication and permission id
 * @param props.admin - Authenticated admin performing the deletion
 * @param props.id - UUID of the permission to delete
 * @returns Void
 * @throws {Error} When the permission does not exist
 */
export async function deleteflexOfficeAdminPermissionsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, id } = props;

  // Verify the permission exists, throws if not
  await MyGlobal.prisma.flex_office_permissions.findUniqueOrThrow({
    where: { id },
  });

  // Soft delete by setting deleted_at timestamp
  await MyGlobal.prisma.flex_office_permissions.update({
    where: { id },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
