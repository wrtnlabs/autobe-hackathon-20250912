import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Delete a column permission permanently by its ID and associated table
 * permission ID.
 *
 * This operation removes the specified column permission from the FlexOffice
 * access control system. It first verifies the existence of the column
 * permission linked to the provided table permission ID.
 *
 * Only administrators are authorized to perform this action.
 *
 * @param props - The request properties.
 * @param props.admin - The authenticated administrator performing this
 *   operation.
 * @param props.tablePermissionId - The UUID of the table permission.
 * @param props.columnPermissionId - The UUID of the column permission to
 *   delete.
 * @throws {Error} When the specified column permission does not exist.
 */
export async function deleteflexOfficeAdminTablePermissionsTablePermissionIdColumnPermissionsColumnPermissionId(props: {
  admin: AdminPayload;
  tablePermissionId: string & tags.Format<"uuid">;
  columnPermissionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, tablePermissionId, columnPermissionId } = props;

  // Verify the column permission exists under the table permission
  const existing =
    await MyGlobal.prisma.flex_office_column_permissions.findFirst({
      where: {
        id: columnPermissionId,
        table_permission_id: tablePermissionId,
      },
    });

  if (!existing) throw new Error("Column permission not found.");

  // Perform hard delete of the column permission
  await MyGlobal.prisma.flex_office_column_permissions.delete({
    where: { id: columnPermissionId },
  });
}
