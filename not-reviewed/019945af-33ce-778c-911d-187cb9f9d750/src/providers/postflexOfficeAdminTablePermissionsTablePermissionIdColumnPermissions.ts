import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeColumnPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeColumnPermission";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Creates a new column permission record linked to a specific table permission.
 *
 * This operation allows administrators to define fine-grained access control
 * restrictions at the column level within database tables.
 *
 * Authorization: Only users with admin role can perform this operation.
 *
 * @param props - The operation parameters including authentication, target
 *   table permission ID, and creation data for the column permission.
 * @param props.admin - The authenticated admin user performing the operation.
 * @param props.tablePermissionId - UUID of the target table permission to link
 *   the new column permission.
 * @param props.body - Data containing the column name to restrict.
 * @returns The newly created column permission record including its ID and
 *   timestamps.
 * @throws {Error} If the creation fails due to database or authorization
 *   issues.
 */
export async function postflexOfficeAdminTablePermissionsTablePermissionIdColumnPermissions(props: {
  admin: AdminPayload;
  tablePermissionId: string & tags.Format<"uuid">;
  body: IFlexOfficeColumnPermission.ICreate;
}): Promise<IFlexOfficeColumnPermission> {
  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.flex_office_column_permissions.create({
    data: {
      id,
      table_permission_id: props.tablePermissionId,
      column_name: props.body.column_name,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    table_permission_id: created.table_permission_id,
    column_name: created.column_name,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
