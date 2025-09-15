import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import { IPageIHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformOrganization";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and retrieve a paginated list of healthcare organizations
 * (multi-tenant boundary).
 *
 * Retrieves a filtered and paginated list of healthcare organizations in the
 * system. Users can search by organization code, name (substring match),
 * status, and creation timestamps (range/filter), supporting advanced query
 * scenarios for administrative and compliance reporting use cases. Only
 * organizations that have not been soft-deleted are included.
 *
 * Authorization: Requires authenticated System Admin (SystemadminPayload) for
 * access. Sensitive information is excluded for roles with reduced privileges.
 * The endpoint ensures robust data isolation and compliance enforcement with
 * RBAC.
 *
 * @param props - Request properties
 * @param props.systemAdmin - The authenticated system administrator performing
 *   the search
 * @param props.body - The search, filter, and pagination criteria
 *   (IHealthcarePlatformOrganization.IRequest)
 * @returns A paginated list of organizations matching the filter, with
 *   pagination metadata and summary records.
 * @throws {Error} If a database error occurs or filter is invalid
 */
export async function patchhealthcarePlatformSystemAdminOrganizations(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformOrganization.IRequest;
}): Promise<IPageIHealthcarePlatformOrganization.ISummary> {
  const { body } = props;

  // Clamp or provide default pagination (page>=1, limit>=1)
  const pageRaw = body.page !== undefined ? body.page : 1;
  const limitRaw = body.limit !== undefined ? body.limit : 20;
  const page = Number(pageRaw) < 1 ? 1 : Number(pageRaw);
  const limit = Number(limitRaw) < 1 ? 20 : Number(limitRaw);
  const skip = (page - 1) * limit;

  // Build Prisma where:
  const where = {
    deleted_at: null,
    ...(body.code !== undefined && {
      code: body.code,
    }),
    ...(body.name !== undefined && {
      name: { contains: body.name },
    }),
    ...(body.status !== undefined && {
      status: body.status,
    }),
    ...(body.created_at_from !== undefined && body.created_at_to !== undefined
      ? { created_at: { gte: body.created_at_from, lte: body.created_at_to } }
      : body.created_at_from !== undefined
        ? { created_at: { gte: body.created_at_from } }
        : body.created_at_to !== undefined
          ? { created_at: { lte: body.created_at_to } }
          : {}),
  };

  // Fetch data page and total at the same time
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_organizations.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.healthcare_platform_organizations.count({ where }),
  ]);

  // Map to IHealthcarePlatformOrganization.ISummary
  const data = rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    status: row.status,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));

  // Pagination structure (ensure branded types)
  const pagination = {
    current: Number(page),
    limit: Number(limit),
    records: Number(total),
    pages: Math.ceil(Number(total) / Number(limit)),
  };

  return {
    pagination,
    data,
  };
}
