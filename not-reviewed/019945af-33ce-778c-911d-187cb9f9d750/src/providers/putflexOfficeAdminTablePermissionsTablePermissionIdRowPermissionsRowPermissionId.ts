import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeRowPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeRowPermission";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update row-level permission filter condition under a given table permission.
 *
 * This operation updates the filter condition (SQL or expression) and the
 * update timestamp of a specific row permission identified by rowPermissionId
 * under the specified tablePermissionId.
 *
 * Authorization is restricted to admin users.
 *
 * @param props - Object containing admin payload, table permission ID, row
 *   permission ID, and the update payload.
 * @param props.admin - The authenticated admin performing the update.
 * @param props.tablePermissionId - UUID of the table permission.
 * @param props.rowPermissionId - UUID of the row-level permission to update.
 * @param props.body - Update payload conforming to
 *   IFlexOfficeRowPermission.IUpdate.
 * @returns The updated IFlexOfficeRowPermission entity.
 * @throws {Error} When the specified row permission does not exist or is
 *   deleted.
 */
export async function putflexOfficeAdminTablePermissionsTablePermissionIdRowPermissionsRowPermissionId(props: {
  admin: AdminPayload;
  tablePermissionId: string & tags.Format<"uuid">;
  rowPermissionId: string & tags.Format<"uuid">;
  body: IFlexOfficeRowPermission.IUpdate;
}): Promise<IFlexOfficeRowPermission> {
  const { admin, tablePermissionId, rowPermissionId, body } = props;

  // Verify existence and deletion status
  const existing = await MyGlobal.prisma.flex_office_row_permissions.findFirst({
    where: {
      id: rowPermissionId,
      table_permission_id: tablePermissionId,
      deleted_at: null,
    },
  });

  if (!existing) {
    throw new Error("Row permission not found or has been deleted");
  }

  // Update fields as allowed
  const updated = await MyGlobal.prisma.flex_office_row_permissions.update({
    where: { id: rowPermissionId },
    data: {
      filter_condition: body.filter_condition,
      updated_at: body.updated_at,
    },
  });

  // Return updated entity with proper date formatting
  return {
    id: updated.id,
    table_permission_id: updated.table_permission_id,
    filter_condition: updated.filter_condition,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
