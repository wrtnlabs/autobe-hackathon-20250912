import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeTablePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeTablePermission";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve detailed information of a table permission by its unique ID.
 *
 * This operation returns the full table permission resource including its
 * associated column and row permissions.
 *
 * Access is restricted to authorized admins.
 *
 * @param props - Object containing admin payload and table permission ID.
 * @param props.admin - Authenticated admin performing the operation.
 * @param props.id - UUID of the table permission to retrieve.
 * @returns Detailed table permission information.
 * @throws {Error} Throws if the table permission with the specified ID does not
 *   exist.
 */
export async function getflexOfficeAdminTablePermissionsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IFlexOfficeTablePermission> {
  const { admin, id } = props;

  const found =
    await MyGlobal.prisma.flex_office_table_permissions.findUniqueOrThrow({
      where: { id },
      include: {
        flex_office_column_permissions: true,
        flex_office_row_permissions: true,
      },
    });

  return {
    id: found.id,
    permission_id: found.permission_id,
    table_name: found.table_name,
    created_at: toISOStringSafe(found.created_at),
    updated_at: toISOStringSafe(found.updated_at),
    deleted_at: found.deleted_at ? toISOStringSafe(found.deleted_at) : null,
    column_permissions: found.flex_office_column_permissions,
    row_permissions: found.flex_office_row_permissions,
  };
}
