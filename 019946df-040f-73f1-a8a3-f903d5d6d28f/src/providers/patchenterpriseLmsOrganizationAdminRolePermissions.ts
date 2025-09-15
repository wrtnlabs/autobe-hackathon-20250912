import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsRolePermissions } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsRolePermissions";
import { IPageIEnterpriseLmsRolePermissions } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsRolePermissions";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

export async function patchenterpriseLmsOrganizationAdminRolePermissions(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IEnterpriseLmsRolePermissions.IRequest;
}): Promise<IPageIEnterpriseLmsRolePermissions.ISummary> {
  const { organizationAdmin, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const where: {
    role_id?: string;
    permission_key?: { contains: string };
    is_allowed?: boolean;
    OR?: {
      permission_key?: { contains: string };
      description?: { contains: string };
    }[];
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

  const orderByField =
    body.orderBy === "permission_key" ? "permission_key" : "permission_key";
  const orderDirection = body.orderDirection === "desc" ? "desc" : "asc";

  const [results, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_role_permissions.findMany({
      where,
      orderBy: { [orderByField]: orderDirection } as const,
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
    data: results.map((r) => ({
      permission_key: r.permission_key,
      description: r.description ?? null,
      is_allowed: r.is_allowed,
    })),
  };
}
