import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePermission";
import { IPageIFlexOfficePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficePermission";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves a paginated list of FlexOffice permission entities according to
 * specified filters such as permission key substring and status.
 *
 * This endpoint requires an authenticated admin user.
 *
 * @param props - Object containing the authenticated admin payload and search
 *   filter body
 * @param props.admin - The authenticated admin making the request
 * @param props.body - The request body containing optional search filters and
 *   pagination
 * @returns Paginated list of FlexOffice permission entities matching the filter
 *   criteria
 * @throws {Error} When database query fails or invalid parameters are provided
 */
export async function patchflexOfficeAdminPermissions(props: {
  admin: AdminPayload;
  body: IFlexOfficePermission.IRequest;
}): Promise<IPageIFlexOfficePermission> {
  const { body } = props;

  // Set default pagination values
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Build Prisma where filter
  const where = {
    deleted_at: null,
    ...(body.permission_key !== undefined &&
      body.permission_key !== null && {
        permission_key: { contains: body.permission_key },
      }),
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
  };

  // Execute paginated findMany and count in parallel
  const [results, total] = await Promise.all([
    MyGlobal.prisma.flex_office_permissions.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.flex_office_permissions.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((r) => ({
      id: r.id,
      permission_key: r.permission_key,
      description: r.description ?? null,
      status: r.status,
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
      deleted_at: r.deleted_at ? toISOStringSafe(r.deleted_at) : null,
    })),
  };
}
