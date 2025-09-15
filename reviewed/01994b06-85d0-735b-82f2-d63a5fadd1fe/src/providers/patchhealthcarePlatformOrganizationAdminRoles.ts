import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRole";
import { IPageIHealthcarePlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformRole";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and paginate the list of roles in the platform
 * (healthcare_platform_roles table).
 *
 * This endpoint allows organization administrators to retrieve a filtered,
 * paginated list of RBAC (role-based access control) roles within the platform.
 * Filters can be applied on role code, display name, scope_type (platform,
 * organization, department), and status (active, retired, system-only,
 * archived, etc.). Supports advanced management, UI, and auditing
 * capabilities.
 *
 * Only roles that have not been soft-deleted (deleted_at: null) are returned.
 * Pagination supports page and limit; ordering is by created_at descending.
 * Returns a paginated container (IPageIHealthcarePlatformRole.ISummary)
 * suitable for admin UI.
 *
 * @param props -
 * @returns Paginated summary of roles matching the filter criteria.
 * @throws {Error} If the organizationAdmin context is missing, or if database
 *   queries fail.
 * @field organizationAdmin The authenticated organization admin, as injected by OrganizationadminAuth decorator (payload.id is healthcare_platform_organizationadmins.id).
 * @field body Request body containing filter and pagination criteria (code, name, scope_type, status, page, limit).
 */
export async function patchhealthcarePlatformOrganizationAdminRoles(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformRole.IRequest;
}): Promise<IPageIHealthcarePlatformRole.ISummary> {
  const { body } = props;

  const page = body.page ?? 0;
  const limit = body.limit ?? 20;

  // Compose the where clause based on filters
  const where = {
    deleted_at: null,
    ...(body.code !== undefined && body.code !== null && { code: body.code }),
    ...(body.scope_type !== undefined &&
      body.scope_type !== null && { scope_type: body.scope_type }),
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.name !== undefined &&
      body.name !== null && { name: { contains: body.name } }),
  };

  const [roles, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_roles.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: Number(page) * Number(limit),
      take: Number(limit),
      select: {
        id: true,
        code: true,
        name: true,
        scope_type: true,
        status: true,
      },
    }),
    MyGlobal.prisma.healthcare_platform_roles.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Number(limit) > 0 ? Math.ceil(Number(total) / Number(limit)) : 0,
    },
    data: roles.map((role) => ({
      id: role.id,
      code: role.code,
      name: role.name,
      scope_type: role.scope_type,
      status: role.status,
    })),
  };
}
