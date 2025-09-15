import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeTablePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeTablePermission";
import { IPageIFlexOfficeTablePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeTablePermission";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and retrieve paginated list of table permissions
 *
 * This PATCH operation enables filtering by permission ID and table name,
 * supporting pagination. Requires admin authorization.
 *
 * @param props - Object containing admin authentication payload and request
 *   body filters
 * @param props.admin - Authenticated admin user payload
 * @param props.body - Request body with pagination and filtering options
 * @returns Paginated summary list of table permissions matching filters
 * @throws {Error} When database query fails or invalid parameters
 */
export async function patchflexOfficeAdminTablePermissions(props: {
  admin: AdminPayload;
  body: IFlexOfficeTablePermission.IRequest;
}): Promise<IPageIFlexOfficeTablePermission.ISummary> {
  const { admin, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const whereCondition = {
    deleted_at: null,
    ...(body.permission_id !== undefined &&
      body.permission_id !== null && { permission_id: body.permission_id }),
    ...(body.table_name !== undefined &&
      body.table_name !== null && { table_name: body.table_name }),
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.flex_office_table_permissions.findMany({
      where: whereCondition,
      select: {
        id: true,
        permission_id: true,
        table_name: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.flex_office_table_permissions.count({
      where: whereCondition,
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
      permission_id: item.permission_id,
      table_name: item.table_name,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
  };
}
