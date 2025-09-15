import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformConfiguration";
import { IPageIHealthcarePlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformConfiguration";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search, filter, and paginate configuration records
 * (healthcare_platform_configuration).
 *
 * Enables platform/system administrators to retrieve a filtered, paginated list
 * of configuration records for the entire platform or by tenant. Supports
 * advanced searching on configuration keys, values, and organizational scoping.
 * This endpoint powers configuration UI screens, policy review, and
 * troubleshooting.
 *
 * Authorization: Requires SystemadminPayload (must be injected via decorator,
 * no checks necessary here—pre-authenticated).
 *
 * @param props - Input parameters
 * @param props.systemAdmin - The authenticated system admin user performing the
 *   query
 * @param props.body - Search and filter options
 * @returns Paginated list of matching configuration records
 * @throws {Error} If database fails (DB error propagated)
 */
export async function patchhealthcarePlatformSystemAdminConfiguration(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformConfiguration.IRequest;
}): Promise<IPageIHealthcarePlatformConfiguration> {
  const { organization_id, key, value, deleted, page, limit, sort } =
    props.body ?? {};

  // Default values for pagination, always non-negative integers
  const _page = typeof page === "number" && page >= 1 ? page : 1;
  const _limit = typeof limit === "number" && limit >= 1 ? limit : 20;

  // Build Prisma where condition using DTO-verified fields
  const where = {
    ...(organization_id !== undefined && {
      healthcare_platform_organization_id: organization_id,
    }),
    ...(key !== undefined && {
      key: {
        contains: key,
      },
    }),
    ...(value !== undefined && {
      value: {
        contains: value,
      },
    }),
    ...(typeof deleted === "boolean"
      ? deleted
        ? { deleted_at: { not: null } }
        : { deleted_at: null }
      : { deleted_at: null }),
  };

  // Defensive, safe sort whitelist
  const sortFieldMap = ["created_at", "updated_at", "key", "value"];
  let orderBy: { [k: string]: "asc" | "desc" } = { created_at: "desc" };
  if (sort) {
    const [field, order] = String(sort)
      .split(" ")
      .map((s) => s.trim());
    if (sortFieldMap.includes(field) && (order === "asc" || order === "desc")) {
      orderBy = { [field]: order };
    }
  }

  const skip = (_page - 1) * _limit;
  // Fetch paginated data and count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_configuration.findMany({
      where,
      orderBy,
      skip,
      take: _limit,
    }),
    MyGlobal.prisma.healthcare_platform_configuration.count({ where }),
  ]);

  return {
    pagination: {
      current: _page,
      limit: _limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / _limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      healthcare_platform_organization_id:
        row.healthcare_platform_organization_id === null ||
        row.healthcare_platform_organization_id === undefined
          ? undefined
          : row.healthcare_platform_organization_id,
      key: row.key,
      value: row.value,
      description: row.description,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      ...(row.deleted_at !== null &&
        row.deleted_at !== undefined && {
          deleted_at: toISOStringSafe(row.deleted_at),
        }),
    })),
  };
}
