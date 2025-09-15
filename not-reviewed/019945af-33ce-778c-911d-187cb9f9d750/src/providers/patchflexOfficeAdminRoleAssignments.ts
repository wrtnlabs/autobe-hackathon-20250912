import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeRoleAssignment";
import { IPageIFlexOfficeRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeRoleAssignment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and retrieve a filtered, paginated list of role assignments.
 *
 * This operation is restricted to administrators due to sensitive nature of
 * role data. It supports filtering by user_id and role_name with pagination.
 *
 * @param props - Object containing admin authentication and filter criteria
 * @param props.admin - Authenticated admin user payload
 * @param props.body - Search and pagination criteria for role assignments
 * @returns A paginated list of role assignments matching the filter criteria
 * @throws {Error} Throws if database access fails
 */
export async function patchflexOfficeAdminRoleAssignments(props: {
  admin: AdminPayload;
  body: IFlexOfficeRoleAssignment.IRequest;
}): Promise<IPageIFlexOfficeRoleAssignment.ISummary> {
  const { admin, body } = props;

  // Pagination parameters with safe defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Build Prisma where clause with careful null and undefined checks
  const where = {
    deleted_at: null as null,
    ...(body.user_id !== undefined &&
      body.user_id !== null && { user_id: body.user_id }),
    ...(body.role_name !== undefined &&
      body.role_name !== null && { role_name: { contains: body.role_name } }),
  };

  // Execute parallel queries to fetch data and total count
  const [results, total] = await Promise.all([
    MyGlobal.prisma.flex_office_role_assignments.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        user_id: true,
        role_name: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.flex_office_role_assignments.count({ where }),
  ]);

  // Map results converting Date to ISO string format with branding
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id,
      user_id: item.user_id,
      role_name: item.role_name,
      created_at: toISOStringSafe(item.created_at),
    })),
  };
}
