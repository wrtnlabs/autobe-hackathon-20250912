import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPolicyVersion";
import { IPageIHealthcarePlatformPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformPolicyVersion";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search, filter, and paginate healthcare policy version records for the
 * admin's organization.
 *
 * This function retrieves a paginated, filterable list of policy version
 * summaries from the compliance catalog (healthcare_platform_policy_versions),
 * supporting advanced queries by type, version, title, effective/expire dates,
 * and free-text search. Only policy versions belonging to the authenticated
 * organizationadmin's organization are returned. Authorization enforced
 * per-tenant.
 *
 * Sorts and paginates results by specified fields. Does not use native Date
 * type at any point; all dates are returned as properly branded ISO 8601
 * strings. Returns pagination info and result data conforming to API
 * structure.
 *
 * @param props - Object containing the authenticated organizationadmin and
 *   search/filter/pagination specification.
 * @param props.organizationAdmin - Authenticated OrganizationadminPayload
 *   (containing top-level orgadmin user id).
 * @param props.body - IHealthcarePlatformPolicyVersion.IRequest (filter, sort,
 *   paginate fields)
 * @returns Paginated result of policy version summaries for the requesting
 *   organization admin.
 * @throws {Error} If input parameters are invalid, or database/query error
 *   occurs.
 */
export async function patchhealthcarePlatformOrganizationAdminPolicyVersions(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformPolicyVersion.IRequest;
}): Promise<IPageIHealthcarePlatformPolicyVersion.ISummary> {
  const { organizationAdmin, body } = props;
  const allowedSortFields = ["effective_at", "title", "created_at"];
  const page = body.page ?? 1;
  const pageSize = body.page_size ?? 10;

  // Compose the where clause, ensuring field null/undefined checks per conventions
  const where = {
    deleted_at: null,
    organization_id: body.organization_id ?? organizationAdmin.id,
    ...(body.policy_type !== undefined &&
      body.policy_type !== null && { policy_type: body.policy_type }),
    ...(body.version !== undefined &&
      body.version !== null && { version: body.version }),
    ...(body.title !== undefined &&
      body.title !== null && { title: { contains: body.title } }),
    ...(body.effective_at_min !== undefined &&
      body.effective_at_min !== null && {
        effective_at: { gte: body.effective_at_min },
      }),
    ...(body.effective_at_max !== undefined &&
      body.effective_at_max !== null && {
        effective_at: {
          ...(body.effective_at_min !== undefined &&
            body.effective_at_min !== null && { gte: body.effective_at_min }),
          lte: body.effective_at_max,
        },
      }),
    ...(body.expires_at_min !== undefined &&
      body.expires_at_min !== null && {
        expires_at: { gte: body.expires_at_min },
      }),
    ...(body.expires_at_max !== undefined &&
      body.expires_at_max !== null && {
        expires_at: {
          ...(body.expires_at_min !== undefined &&
            body.expires_at_min !== null && { gte: body.expires_at_min }),
          lte: body.expires_at_max,
        },
      }),
    ...(body.search !== undefined &&
      body.search !== null && {
        OR: [
          { title: { contains: body.search } },
          { version: { contains: body.search } },
          { policy_type: { contains: body.search } },
        ],
      }),
  };

  const skip = (page - 1) * pageSize;
  const take = pageSize;

  // Prisma orderBy logic now fully inline
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_policy_versions.findMany({
      where,
      orderBy:
        body.sort_field !== undefined &&
        body.sort_field !== null &&
        allowedSortFields.includes(body.sort_field)
          ? {
              [body.sort_field]:
                body.sort_direction === "asc"
                  ? ("asc" as const)
                  : ("desc" as const),
            }
          : { created_at: "desc" as const },
      skip,
      take,
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

  return {
    pagination: {
      current: Number(page),
      limit: Number(pageSize),
      records: Number(total),
      pages: Math.ceil(total / pageSize),
    },
    data: rows.map((row) => ({
      id: row.id,
      policy_type: row.policy_type,
      version: row.version,
      title: row.title,
      effective_at: toISOStringSafe(row.effective_at),
      expires_at:
        row.expires_at === null ? null : toISOStringSafe(row.expires_at),
    })),
  };
}
