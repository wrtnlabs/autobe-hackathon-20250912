import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRole";
import { IPageIHealthcarePlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformRole";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and paginate the list of roles in the platform
 * (healthcare_platform_roles table).
 *
 * This endpoint provides system administrators with filtered, paginated access
 * to all RBAC roles, supporting search by code, name, scope_type, and status.
 * It returns a summary list for management UI and audit purposes. Supports
 * advanced search queries, pagination, and sorting by creation date. Only
 * system administrators may call this endpoint.
 *
 * @param props - Entrypoint properties
 * @param props.systemAdmin - The authenticated Systemadmin payload
 *   (authorization required)
 * @param props.body - Filtering and pagination parameters per
 *   IHealthcarePlatformRole.IRequest
 * @returns A paginated list of summary role objects matching the provided
 *   filter
 * @throws {Error} If the authorization payload is missing or invalid
 */
export async function patchhealthcarePlatformSystemAdminRoles(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformRole.IRequest;
}): Promise<IPageIHealthcarePlatformRole.ISummary> {
  // Authorization: enforced by decorator, explicit destructure for clarity
  const { body } = props;

  // Extract and sanitize pagination parameters (defaults: page=1, limit=20)
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);
  const skip = (page - 1) * limit;

  // Build dynamic Prisma where conditions, only using defined filters
  const where = {
    deleted_at: null,
    ...(body.code !== undefined && body.code !== null && { code: body.code }),
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.scope_type !== undefined &&
      body.scope_type !== null && { scope_type: body.scope_type }),
    ...(body.name !== undefined &&
      body.name !== null && { name: { contains: body.name } }),
  };

  // Query total row count (for pagination) and paginated row results in parallel
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_roles.count({ where }),
    MyGlobal.prisma.healthcare_platform_roles.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
  ]);

  // Map Prisma rows to ISummary DTOs
  const data = rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    scope_type: row.scope_type,
    status: row.status,
  }));

  // Compose pagination object matching required IPage.IPagination brand types
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
