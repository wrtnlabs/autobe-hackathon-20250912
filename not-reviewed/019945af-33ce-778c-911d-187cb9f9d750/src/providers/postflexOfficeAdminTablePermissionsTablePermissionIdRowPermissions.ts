import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeRowPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeRowPermission";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new row-level permission filter condition under the specified table
 * permission.
 *
 * This allows defining granular row-level access restrictions for the
 * associated table permission. Only users with admin role may execute this
 * operation.
 *
 * @param props - Object containing the authenticated admin user, target table
 *   permission ID, and row permission creation payload.
 * @param props.admin - Authenticated admin user performing the operation.
 * @param props.tablePermissionId - UUID of the target table permission to link
 *   the new row permission.
 * @param props.body - Payload containing the filter condition for the new row
 *   permission.
 * @returns The newly created row permission entity including auditing
 *   timestamps.
 * @throws {Error} Throws if creation fails or database constraints are
 *   violated.
 */
export async function postflexOfficeAdminTablePermissionsTablePermissionIdRowPermissions(props: {
  admin: AdminPayload;
  tablePermissionId: string & tags.Format<"uuid">;
  body: IFlexOfficeRowPermission.ICreate;
}): Promise<IFlexOfficeRowPermission> {
  const { admin, tablePermissionId, body } = props;

  const created = await MyGlobal.prisma.flex_office_row_permissions.create({
    data: {
      id: v4(),
      table_permission_id: tablePermissionId,
      filter_condition: body.filter_condition,
    },
  });

  return {
    id: created.id,
    table_permission_id: created.table_permission_id,
    filter_condition: created.filter_condition,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
