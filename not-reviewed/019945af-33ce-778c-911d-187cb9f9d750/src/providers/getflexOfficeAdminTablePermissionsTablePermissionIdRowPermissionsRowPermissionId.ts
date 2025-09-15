import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeRowPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeRowPermission";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve row-level permission by ID under a table permission.
 *
 * This operation retrieves a specific row-level permission filter condition
 * associated with a given table permission in the FlexOffice access control
 * system. It supports fine-grained access control at the database row level by
 * returning details of the filter condition.
 *
 * Only authenticated admin users may retrieve this data.
 *
 * @param props - Object containing the admin payload, table permission ID, and
 *   row permission ID.
 * @param props.admin - The authenticated admin making the request.
 * @param props.tablePermissionId - UUID of the table permission whose row
 *   permission is requested.
 * @param props.rowPermissionId - UUID of the row-level permission to retrieve.
 * @returns The row-level permission entity conforming to
 *   IFlexOfficeRowPermission.
 * @throws {Error} Throws if the row permission does not exist or if access is
 *   unauthorized.
 */
export async function getflexOfficeAdminTablePermissionsTablePermissionIdRowPermissionsRowPermissionId(props: {
  admin: AdminPayload;
  tablePermissionId: string & tags.Format<"uuid">;
  rowPermissionId: string & tags.Format<"uuid">;
}): Promise<IFlexOfficeRowPermission> {
  const { admin, tablePermissionId, rowPermissionId } = props;

  const found =
    await MyGlobal.prisma.flex_office_row_permissions.findFirstOrThrow({
      where: {
        id: rowPermissionId,
        table_permission_id: tablePermissionId,
      },
    });

  return {
    id: found.id,
    table_permission_id: found.table_permission_id,
    filter_condition: found.filter_condition,
    created_at: toISOStringSafe(found.created_at),
    updated_at: toISOStringSafe(found.updated_at),
    deleted_at: found.deleted_at ? toISOStringSafe(found.deleted_at) : null,
  };
}
