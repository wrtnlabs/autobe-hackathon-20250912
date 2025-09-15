import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeRowPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeRowPermission";
import { IPageIFlexOfficeRowPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeRowPermission";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * List and search row permissions for a specified table permission.
 *
 * Retrieves paginated row-level permissions filtered by tablePermissionId and
 * optional filter_condition partial match.
 *
 * @param props - Properties including authenticated admin, tablePermissionId,
 *   and request body with search and pagination
 * @returns Paginated summary list of row permissions
 * @throws If there is any unexpected error during the database query
 */
export async function patchflexOfficeAdminTablePermissionsTablePermissionIdRowPermissions(props: {
  admin: AdminPayload;
  tablePermissionId: string & tags.Format<"uuid">;
  body: IFlexOfficeRowPermission.IRequest;
}): Promise<IPageIFlexOfficeRowPermission.ISummary> {
  const { admin, tablePermissionId, body } = props;

  // Authorization is assumed handled by decorator

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;

  const skip = (page - 1) * limit;

  const where = {
    table_permission_id: tablePermissionId,
    deleted_at: null,
    ...(body.filter_condition !== undefined &&
      body.filter_condition !== null && {
        filter_condition: { contains: body.filter_condition },
      }),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.flex_office_row_permissions.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.flex_office_row_permissions.count({ where }),
  ]);

  const data = rows.map((row) => ({
    id: row.id as string & tags.Format<"uuid">,
    table_permission_id: row.table_permission_id as string &
      tags.Format<"uuid">,
    filter_condition: row.filter_condition,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data,
  };
}
