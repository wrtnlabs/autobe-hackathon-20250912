import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsRolePermissions } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsRolePermissions";
import { IPageIEnterpriseLmsRolePermissions } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsRolePermissions";
import { ContentcreatorinstructorPayload } from "../decorators/payload/ContentcreatorinstructorPayload";

/**
 * Retrieves a paginated list of LMS role permissions assigned to roles.
 *
 * This operation supports filtering by role ID, permission key, allowed flag,
 * search keywords, and sorting. Pagination parameters `page` and `limit` are
 * used to control result size.
 *
 * @param props - Object containing authentication and request body parameters
 * @param props.contentCreatorInstructor - Authenticated content creator
 *   instructor info
 * @param props.body - Filtering and pagination parameters conforming to
 *   IEnterpriseLmsRolePermissions.IRequest
 * @returns A paginated summary list of role permissions matching the criteria
 * @throws Error if database operation fails
 */
export async function patchenterpriseLmsContentCreatorInstructorRolePermissions(props: {
  contentCreatorInstructor: ContentcreatorinstructorPayload;
  body: IEnterpriseLmsRolePermissions.IRequest;
}): Promise<IPageIEnterpriseLmsRolePermissions.ISummary> {
  const { body } = props;

  // Normalize pagination with defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Build where clause with filters
  const where: {
    role_id?: string & tags.Format<"uuid">;
    permission_key?: { contains: string };
    is_allowed?: boolean;
    OR?:
      | { permission_key: { contains: string } }[]
      | { description: { contains: string } }[];
  } = {};

  if (body.role_id !== undefined && body.role_id !== null) {
    where.role_id = body.role_id;
  }
  if (body.permission_key !== undefined && body.permission_key !== null) {
    where.permission_key = { contains: body.permission_key };
  }
  if (body.is_allowed !== undefined && body.is_allowed !== null) {
    where.is_allowed = body.is_allowed;
  }
  if (body.search !== undefined && body.search !== null) {
    where.OR = [
      { permission_key: { contains: body.search } },
      { description: { contains: body.search } },
    ];
  }

  // Allowed order fields
  const allowedOrderFields = ["permission_key", "created_at", "updated_at"];
  const orderField =
    body.orderBy && allowedOrderFields.includes(body.orderBy)
      ? body.orderBy
      : "permission_key";

  const orderDirection = body.orderDirection === "asc" ? "asc" : "desc";

  // Query data and count in parallel
  const [results, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_role_permissions.findMany({
      where,
      orderBy: { [orderField]: orderDirection },
      skip,
      take: limit,
      select: {
        permission_key: true,
        description: true,
        is_allowed: true,
      },
    }),
    MyGlobal.prisma.enterprise_lms_role_permissions.count({ where }),
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
