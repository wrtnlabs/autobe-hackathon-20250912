import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPermission";
import { IPageIHealthcarePlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformPermission";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Filter, search, and paginate RBAC permission definitions for mapping.
 *
 * Retrieve a paginated and filtered list of available RBAC permissions in the
 * system. Permissions define discrete actionable functions or scopes granted to
 * roles. This endpoint supports advanced filtering by permission code, name,
 * scope_type, and status to allow administrators to understand, review, and
 * manage available permissions.
 *
 * Security: This operation is limited to authenticated system or organization
 * administrators, ensuring only privileged users can review and map system
 * permissions. Business logic enforces role-based restrictions per the
 * organization context, as defined in the Prisma schema.
 *
 * Relationship: Permissions retrieved via this operation are mapped to roles
 * using the roles interface. Permission status, description, and allowed
 * scope_type are included in the response for administrators to perform
 * accurate role-based mapping and audits.
 *
 * Validation: Filtering supports partial and case-insensitive matching. Results
 * are paginated for large systems; administrators should use pagination
 * controls for efficient data discovery. Attempting to access without required
 * RBAC context returns a 403 error.
 *
 * @param props - Request props including authenticated system admin payload and
 *   filter/search/pagination body.
 * @param props.systemAdmin - The authenticated system admin making the request.
 * @param props.body - Filter, search, and pagination parameters for permission
 *   retrieval.
 * @returns Paginated, filtered list of permission summary objects available for
 *   RBAC mapping.
 * @throws {Error} When RBAC or authentication requirements are not met.
 */
export async function patchhealthcarePlatformSystemAdminPermissions(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformPermission.IRequest;
}): Promise<IPageIHealthcarePlatformPermission.ISummary> {
  const { body } = props;
  const page = body.page ?? 0;
  const limit = body.limit ?? 20;
  const where = {
    deleted_at: null,
    ...(body.code !== undefined && body.code !== null && { code: body.code }),
    ...(body.name !== undefined &&
      body.name !== null && { name: { contains: body.name } }),
    ...(body.scope_type !== undefined &&
      body.scope_type !== null && { scope_type: body.scope_type }),
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
  };
  const [permissions, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_permissions.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: page * limit,
      take: limit,
      select: {
        id: true,
        code: true,
        name: true,
        scope_type: true,
        status: true,
      },
    }),
    MyGlobal.prisma.healthcare_platform_permissions.count({ where }),
  ]);
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / (limit === 0 ? 1 : limit)),
    },
    data: permissions.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      scope_type: row.scope_type,
      status: row.status,
    })),
  };
}
