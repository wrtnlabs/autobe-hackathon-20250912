import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsRolePermissions } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsRolePermissions";
import { IPageIEnterpriseLmsRolePermissions } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsRolePermissions";
import { DepartmentmanagerPayload } from "../decorators/payload/DepartmentmanagerPayload";

/**
 * Retrieve paginated list of LMS role permissions.
 *
 * This operation fetches role permissions filtered and paginated based on the
 * request body containing search criteria, pagination, and sorting options.
 *
 * Only authorized department managers can perform this operation.
 *
 * @param props - Input properties containing the department manager and request
 *   body
 * @param props.departmentManager - Authenticated department manager payload
 * @param props.body - Request body with pagination and filter criteria
 * @returns Paginated summary list of role permissions matching the criteria
 * @throws {Error} If database query fails or unexpected conditions occur
 */
export async function patchenterpriseLmsDepartmentManagerRolePermissions(props: {
  departmentManager: DepartmentmanagerPayload;
  body: IEnterpriseLmsRolePermissions.IRequest;
}): Promise<IPageIEnterpriseLmsRolePermissions.ISummary> {
  const { body } = props;

  const page = typeof body.page === "number" && body.page > 0 ? body.page : 1;
  const limit =
    typeof body.limit === "number" && body.limit > 0 ? body.limit : 10;
  const skip = (page - 1) * limit;

  const whereCondition = {
    ...(body.search !== undefined &&
      body.search !== null && {
        OR: [
          { permission_key: { contains: body.search } },
          { description: { contains: body.search } },
        ],
      }),
    ...(body.permission_key !== undefined &&
      body.permission_key !== null && {
        permission_key: body.permission_key,
      }),
    ...(body.role_id !== undefined &&
      body.role_id !== null && {
        role_id: body.role_id,
      }),
    ...(body.is_allowed !== undefined &&
      body.is_allowed !== null && {
        is_allowed: body.is_allowed,
      }),
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_role_permissions.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: {
        [body.orderBy &&
        (body.orderBy === "permission_key" ||
          body.orderBy === "description" ||
          body.orderBy === "is_allowed")
          ? body.orderBy
          : "permission_key"]:
          body.orderDirection && body.orderDirection.toLowerCase() === "desc"
            ? "desc"
            : "asc",
      },
      select: {
        permission_key: true,
        description: true,
        is_allowed: true,
      },
    }),
    MyGlobal.prisma.enterprise_lms_role_permissions.count({
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
      permission_key: item.permission_key,
      description: item.description ?? null,
      is_allowed: item.is_allowed,
    })),
  };
}
