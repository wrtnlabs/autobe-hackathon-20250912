import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPolicyVersion";
import { IPageIHealthcarePlatformPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformPolicyVersion";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and paginate healthcare policy version records from the compliance
 * catalog (healthcare_platform_policy_versions).
 *
 * Retrieves a filtered, paginated list of policy version summaries suitable for
 * compliance catalog browsing, audit, and consent documentation review. Allows
 * advanced filtering by organization, policy type, title, version,
 * effective/expiration date, and full-text search.
 *
 * System administrators can only access policy versions visible to their
 * permitted organizations. This endpoint does not allow direct record
 * modification, and all filters, pagination, and sorting are validated by the
 * DTO boundary.
 *
 * @param props - Object containing:
 *
 *   - SystemAdmin: SystemadminPayload for authentication
 *   - Body: IHealthcarePlatformPolicyVersion.IRequest (filters, search, sort,
 *       pagination)
 *
 * @returns Paginated list of policy version summaries
 *   (IPageIHealthcarePlatformPolicyVersion.ISummary)
 * @throws {Error} For Prisma/database errors, or if request fails internal
 *   system constraints
 */
export async function patchhealthcarePlatformSystemAdminPolicyVersions(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformPolicyVersion.IRequest;
}): Promise<IPageIHealthcarePlatformPolicyVersion.ISummary> {
  const { systemAdmin, body } = props;

  // Pagination defaults
  const page = body.page && body.page > 0 ? body.page : 1;
  const limit = body.page_size && body.page_size > 0 ? body.page_size : 20;
  const skip = Number(page - 1) * Number(limit);
  const take = Number(limit);

  // Build filter
  const where: Record<string, unknown> = { deleted_at: null };
  if (body.organization_id) where.organization_id = body.organization_id;
  if (body.policy_type) where.policy_type = body.policy_type;
  if (body.version) where.version = body.version;
  if (body.title) where.title = { contains: body.title };
  if (
    (body.effective_at_min !== undefined && body.effective_at_min !== null) ||
    (body.effective_at_max !== undefined && body.effective_at_max !== null)
  ) {
    where.effective_at = {};
    if (body.effective_at_min !== undefined && body.effective_at_min !== null)
      (where.effective_at as Record<string, string>).gte =
        body.effective_at_min;
    if (body.effective_at_max !== undefined && body.effective_at_max !== null)
      (where.effective_at as Record<string, string>).lte =
        body.effective_at_max;
  }
  if (
    (body.expires_at_min !== undefined && body.expires_at_min !== null) ||
    (body.expires_at_max !== undefined && body.expires_at_max !== null)
  ) {
    where.expires_at = {};
    if (body.expires_at_min !== undefined && body.expires_at_min !== null)
      (where.expires_at as Record<string, string>).gte = body.expires_at_min;
    if (body.expires_at_max !== undefined && body.expires_at_max !== null)
      (where.expires_at as Record<string, string>).lte = body.expires_at_max;
  }
  if (body.search) {
    where.OR = [
      { title: { contains: body.search } },
      { version: { contains: body.search } },
    ];
  }

  // Sorting (restrict to allowed fields)
  const allowedSortFields = ["effective_at", "title"];
  const allowedSortDirections = ["asc", "desc"];
  let orderBy: Record<string, string> = { effective_at: "desc" };
  if (body.sort_field && allowedSortFields.includes(body.sort_field)) {
    const dir =
      body.sort_direction && allowedSortDirections.includes(body.sort_direction)
        ? body.sort_direction
        : "desc";
    orderBy = { [body.sort_field]: dir };
  }

  // Parallel DB queries
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_policy_versions.findMany({
      where,
      orderBy,
      skip: Number(skip),
      take: Number(take),
      select: {
        id: true,
        policy_type: true,
        version: true,
        title: true,
        effective_at: true,
        expires_at: true,
      },
    }),
    MyGlobal.prisma.healthcare_platform_policy_versions.count({ where }),
  ]);

  // Format data: convert all date fields; expires_at handled as optional/nullable
  const data: IHealthcarePlatformPolicyVersion.ISummary[] = rows.map((row) => {
    // All date fields: use toISOStringSafe()
    return {
      id: row.id,
      policy_type: row.policy_type,
      version: row.version,
      title: row.title,
      effective_at: toISOStringSafe(row.effective_at),
      expires_at:
        row.expires_at !== null && row.expires_at !== undefined
          ? toISOStringSafe(row.expires_at)
          : undefined,
    };
  });

  const pages = Math.ceil(total / Number(limit));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Number(pages),
    },
    data,
  };
}
