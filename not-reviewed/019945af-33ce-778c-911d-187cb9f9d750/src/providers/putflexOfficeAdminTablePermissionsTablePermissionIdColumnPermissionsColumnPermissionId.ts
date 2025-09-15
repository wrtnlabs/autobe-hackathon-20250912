import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeColumnPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeColumnPermission";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing column permission by its ID under a specified table
 * permission.
 *
 * Allows administrative users to modify access restrictions at the column level
 * within database tables.
 *
 * Verifies that the column permission belongs to the specified table permission
 * and updates the column name. Maintains audit timestamps and returns the fully
 * updated column permission record.
 *
 * @param props - Object containing admin authentication, the table permission
 *   ID, column permission ID, and the update body.
 * @param props.admin - The authenticated admin user performing the update.
 * @param props.tablePermissionId - The unique identifier of the target table
 *   permission.
 * @param props.columnPermissionId - The unique identifier of the column
 *   permission to be updated.
 * @param props.body - Request body containing updated column_name.
 * @returns The updated column permission details conforming to
 *   IFlexOfficeColumnPermission.
 * @throws {Error} When the column permission does not exist.
 * @throws {Error} When the column permission does not belong to the specified
 *   table permission.
 */
export async function putflexOfficeAdminTablePermissionsTablePermissionIdColumnPermissionsColumnPermissionId(props: {
  admin: AdminPayload;
  tablePermissionId: string & tags.Format<"uuid">;
  columnPermissionId: string & tags.Format<"uuid">;
  body: IFlexOfficeColumnPermission.IUpdate;
}): Promise<IFlexOfficeColumnPermission> {
  const { admin, tablePermissionId, columnPermissionId, body } = props;

  const existing =
    await MyGlobal.prisma.flex_office_column_permissions.findUniqueOrThrow({
      where: { id: columnPermissionId },
    });

  if (existing.table_permission_id !== tablePermissionId) {
    throw new Error(
      "Column permission does not belong to the specified table permission",
    );
  }

  const updated = await MyGlobal.prisma.flex_office_column_permissions.update({
    where: { id: columnPermissionId },
    data: {
      column_name: body.column_name,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    table_permission_id: updated.table_permission_id,
    column_name: updated.column_name,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
