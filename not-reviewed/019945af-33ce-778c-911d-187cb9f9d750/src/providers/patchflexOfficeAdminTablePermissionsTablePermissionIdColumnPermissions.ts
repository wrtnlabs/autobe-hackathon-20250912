import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeColumnPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeColumnPermission";
import { IPageIFlexOfficeColumnPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeColumnPermission";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * List column permissions under a specific table permission.
 *
 * This operation retrieves a paginated list of column permissions filtered by
 * the table permission ID. It supports optional filtering by column name,
 * pagination, and sorts results by creation date descending.
 *
 * Authorization is enforced via the admin parameter, ensuring only authorized
 * admins can perform this operation.
 *
 * @param props - Object containing admin payload, tablePermissionId, and
 *   request body.
 * @param props.admin - The authenticated admin performing the query.
 * @param props.tablePermissionId - UUID of the parent table permission.
 * @param props.body - Filtering and pagination parameters.
 * @returns A paginated summary list of column permissions matching the
 *   criteria.
 * @throws {Error} Propagates any errors related to database or authorization
 *   failures.
 */
export async function patchflexOfficeAdminTablePermissionsTablePermissionIdColumnPermissions(props: {
  admin: AdminPayload;
  tablePermissionId: string & tags.Format<"uuid">;
  body: IFlexOfficeColumnPermission.IRequest;
}): Promise<IPageIFlexOfficeColumnPermission.ISummary> {
  const { admin, tablePermissionId, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const whereConditions = {
    deleted_at: null,
    table_permission_id: tablePermissionId,
    ...(body.column_name !== undefined &&
      body.column_name !== null && {
        column_name: { contains: body.column_name },
      }),
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.flex_office_column_permissions.findMany({
      where: whereConditions,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.flex_office_column_permissions.count({
      where: whereConditions,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id,
      table_permission_id: item.table_permission_id,
      column_name: item.column_name,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
  };
}
