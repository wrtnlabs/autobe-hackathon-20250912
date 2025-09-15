import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformConfiguration";
import { IPageIHealthcarePlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformConfiguration";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search, filter, and paginate configuration records
 * (healthcare_platform_configuration).
 *
 * Enables platform/system administrators and authorized organization
 * administrators to retrieve a filtered, paginated list of configuration
 * records for the entire platform or by tenant. Advanced searching by
 * configuration key, value, or organizational scoping is available along with
 * filtering for soft-deleted status. Only relevant configurations (for admin's
 * organization or global) are returned. Supports pagination, key/value partial
 * matches, sorting, and audit-compliant view logic.
 *
 * @param props - OrganizationAdmin: Payload for authenticated organization
 *   admin (id is org ID). body: Search and pagination requests with filters
 *   (organization, key, value, etc).
 * @returns Paginated list of configuration records matching query.
 * @throws {Error} If sorting is attempted on a non-whitelisted field.
 */
export async function patchhealthcarePlatformOrganizationAdminConfiguration(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformConfiguration.IRequest;
}): Promise<IPageIHealthcarePlatformConfiguration> {
  const { organizationAdmin, body } = props;
  const {
    organization_id,
    key,
    value,
    deleted,
    page = 1,
    limit = 20,
    sort,
  } = body;

  // Tenant scope: restrict to configs for admin's org or global
  const orgScope = organizationAdmin.id;
  const where = {
    OR: [
      { healthcare_platform_organization_id: orgScope },
      { healthcare_platform_organization_id: null },
    ],
    ...(key !== undefined && key !== null && { key: { contains: key } }),
    ...(value !== undefined &&
      value !== null && { value: { contains: value } }),
    ...(deleted === true
      ? { deleted_at: { not: null } }
      : { deleted_at: null }),
  };

  // Only allow sorting by specific fields
  const allowedSort = ["created_at", "updated_at", "key", "description", "id"];
  let orderBy: Record<string, "asc" | "desc"> = { created_at: "desc" };
  if (sort) {
    const [field, dir] = sort.trim().split(" ");
    if (allowedSort.includes(field)) {
      orderBy = {
        [field]: dir === "asc" ? "asc" : "desc",
      };
    } else {
      throw new Error(`Sorting by field '${field}' is not allowed.`);
    }
  }

  // Use pagination defaults; ensure they work with tags.Type<'int32'>
  const pageNum = Number(page) > 0 ? Number(page) : 1;
  const limitNum = Number(limit) > 0 ? Number(limit) : 20;
  const skip = (pageNum - 1) * limitNum;

  // Query and count in parallel
  const [configs, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_configuration.findMany({
      where,
      orderBy,
      skip,
      take: limitNum,
    }),
    MyGlobal.prisma.healthcare_platform_configuration.count({ where }),
  ]);

  // Transform configs to DTO, formatting all dates properly
  const data = configs.map((conf) => ({
    id: conf.id,
    healthcare_platform_organization_id:
      conf.healthcare_platform_organization_id ?? null,
    key: conf.key,
    value: conf.value,
    description: conf.description,
    created_at: toISOStringSafe(conf.created_at),
    updated_at: toISOStringSafe(conf.updated_at),
    deleted_at: conf.deleted_at ? toISOStringSafe(conf.deleted_at) : null,
  }));

  const totalPages = Math.ceil(total / limitNum);
  return {
    pagination: {
      current: Number(pageNum),
      limit: Number(limitNum),
      records: Number(total),
      pages: Number(totalPages),
    },
    data,
  };
}
