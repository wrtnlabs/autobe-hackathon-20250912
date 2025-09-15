import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeColumnPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeColumnPermission";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get detailed information of a column permission by ID.
 *
 * This function retrieves a specific column permission scoped under a table
 * permission, identified by their respective UUIDs.
 *
 * Authorization is enforced by requiring an admin payload.
 *
 * @param props - Object containing admin payload and the IDs of the table
 *   permission and column permission
 * @param props.admin - Authenticated admin payload
 * @param props.tablePermissionId - UUID of the parent table permission
 * @param props.columnPermissionId - UUID of the target column permission
 * @returns The detailed column permission record
 * @throws If no matching column permission is found or on any database error
 */
export async function getflexOfficeAdminTablePermissionsTablePermissionIdColumnPermissionsColumnPermissionId(props: {
  admin: AdminPayload;
  tablePermissionId: string & tags.Format<"uuid">;
  columnPermissionId: string & tags.Format<"uuid">;
}): Promise<IFlexOfficeColumnPermission> {
  const { admin, tablePermissionId, columnPermissionId } = props;

  const record =
    await MyGlobal.prisma.flex_office_column_permissions.findFirstOrThrow({
      where: {
        id: columnPermissionId,
        table_permission_id: tablePermissionId,
      },
    });

  return {
    id: record.id,
    table_permission_id: record.table_permission_id,
    column_name: record.column_name,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
