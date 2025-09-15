import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Deletes a specific row-level permission filter condition under a given table
 * permission.
 *
 * This is a hard delete operation removing the filter condition permanently.
 * Only admins can perform this operation.
 *
 * @param props - Object containing admin authentication and IDs
 * @param props.admin - The authenticated admin performing the deletion
 * @param props.tablePermissionId - UUID of the parent table permission
 * @param props.rowPermissionId - UUID of the row permission to delete
 * @returns Void
 * @throws {Error} Throws if authorization fails or if the row permission does
 *   not exist or does not belong to the specified table permission
 */
export async function deleteflexOfficeAdminTablePermissionsTablePermissionIdRowPermissionsRowPermissionId(props: {
  admin: AdminPayload;
  tablePermissionId: string & tags.Format<"uuid">;
  rowPermissionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, tablePermissionId, rowPermissionId } = props;

  // Authorization check: verify admin exists and is active
  const adminRecord = await MyGlobal.prisma.flex_office_admins.findFirst({
    where: {
      id: admin.id,
      deleted_at: null,
    },
  });
  if (!adminRecord) {
    throw new Error("Unauthorized: Admin not found or deleted");
  }

  // Verify row permission exists and belongs to the table permission
  const rowPermission =
    await MyGlobal.prisma.flex_office_row_permissions.findUnique({
      where: { id: rowPermissionId },
    });
  if (!rowPermission) {
    throw new Error("Row permission not found");
  }
  if (rowPermission.table_permission_id !== tablePermissionId) {
    throw new Error(
      "Row permission does not belong to the specified table permission",
    );
  }

  // Hard delete the row permission
  await MyGlobal.prisma.flex_office_row_permissions.delete({
    where: { id: rowPermissionId },
  });
}
