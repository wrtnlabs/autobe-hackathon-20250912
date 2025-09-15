import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsRolePermissions } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsRolePermissions";
import { IPageIEnterpriseLmsRolePermissions } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsRolePermissions";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve paginated list of LMS role permissions.
 *
 * This function fetches role permissions with filtering, pagination, and
 * sorting. It requires authentication as a system administrator.
 *
 * @param props - The request properties including systemAdmin payload and
 *   filter body
 * @param props.systemAdmin - The authenticated system administrator payload
 * @param props.body - The filter, pagination, and sorting request body
 * @returns A paginated summary list of role permissions
 * @throws {Error} When the database query fails
 */
export async function patchenterpriseLmsSystemAdminRolePermissions(props: {
  systemAdmin: SystemadminPayload;
  body: IEnterpriseLmsRolePermissions.IRequest;
}): Promise<IPageIEnterpriseLmsRolePermissions.ISummary> {
  const { systemAdmin, body } = props;

  const page = (body.page ?? 0) < 0 ? 0 : (body.page ?? 0);
  const limit = (body.limit ?? 10) <= 0 ? 10 : (body.limit ?? 10);

  const where: {
    permission_key?: { contains: string };
    role_id?: string & tags.Format<"uuid">;
    is_allowed?: boolean;
    OR?: Array<
      | { permission_key: { contains: string } }
      | { description: { contains: string } }
    >;
  } = {};

  if (body.permission_key !== undefined && body.permission_key !== null) {
    where.permission_key = { contains: body.permission_key };
  }

  if (body.role_id !== undefined && body.role_id !== null) {
    where.role_id = body.role_id;
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

  const validOrderByFields = ["permission_key", "description", "is_allowed"];
  const orderByField =
    typeof body.orderBy === "string" &&
    validOrderByFields.includes(body.orderBy)
      ? body.orderBy
      : "permission_key";

  const orderDirectionRaw =
    typeof body.orderDirection === "string"
      ? body.orderDirection.toLowerCase()
      : null;
  const orderDirection =
    orderDirectionRaw === "asc" || orderDirectionRaw === "desc"
      ? orderDirectionRaw
      : "desc";

  const skip = page * limit;

  const [results, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_role_permissions.findMany({
      where,
      orderBy: { [orderByField]: orderDirection },
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
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results,
  };
}
