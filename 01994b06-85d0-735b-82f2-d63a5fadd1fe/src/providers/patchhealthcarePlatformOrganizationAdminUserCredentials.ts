import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformUserCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserCredential";
import { IPageIHealthcarePlatformUserCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformUserCredential";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and paginate archived user credential records in the
 * healthcare_platform_user_credentials table (hashes never exposed).
 *
 * This endpoint allows authorized organization administrators to search and
 * retrieve paginated historical user credential entries, for compliance and
 * security audit purposes. Filtering includes user_id, user_type,
 * credential_type, and date ranges on archived_at or created_at. Pagination and
 * sorting are supported. The credential_hash is never exposed. Only privileged
 * organization admins may access this operation.
 *
 * @param props - The operation props object
 * @param props.organizationAdmin - The authenticated organization admin payload
 * @param props.body - Search and pagination filters
 * @returns Paginated credential record summaries (id, user_id, user_type,
 *   credential_type, archived_at, created_at)
 * @throws {Error} If unauthorized or a system error occurs
 */
export async function patchhealthcarePlatformOrganizationAdminUserCredentials(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformUserCredential.IRequest;
}): Promise<IPageIHealthcarePlatformUserCredential.ISummary> {
  const { body } = props;
  // Defensive: ensure pagination is valid and positive integer
  const pageRaw = body.page !== undefined && body.page !== null ? body.page : 1;
  const pageSizeRaw =
    body.pageSize !== undefined && body.pageSize !== null ? body.pageSize : 20;
  const page = Number(pageRaw) < 1 ? 1 : Number(pageRaw);
  const limit = Number(pageSizeRaw) < 1 ? 20 : Number(pageSizeRaw);
  const skip = (page - 1) * limit;

  // Build where clause for Prisma query, only add fields if present
  const archivedAtRange =
    (body.archived_at_from !== undefined && body.archived_at_from !== null) ||
    (body.archived_at_to !== undefined && body.archived_at_to !== null)
      ? {
          archived_at: {
            ...(body.archived_at_from !== undefined &&
            body.archived_at_from !== null
              ? { gte: body.archived_at_from }
              : {}),
            ...(body.archived_at_to !== undefined &&
            body.archived_at_to !== null
              ? { lte: body.archived_at_to }
              : {}),
          },
        }
      : {};

  const createdAtRange =
    (body.created_at_from !== undefined && body.created_at_from !== null) ||
    (body.created_at_to !== undefined && body.created_at_to !== null)
      ? {
          created_at: {
            ...(body.created_at_from !== undefined &&
            body.created_at_from !== null
              ? { gte: body.created_at_from }
              : {}),
            ...(body.created_at_to !== undefined && body.created_at_to !== null
              ? { lte: body.created_at_to }
              : {}),
          },
        }
      : {};

  // Main dynamic filter
  const where = {
    ...(body.user_id !== undefined &&
      body.user_id !== null && { user_id: body.user_id }),
    ...(body.user_type !== undefined &&
      body.user_type !== null && { user_type: body.user_type }),
    ...(body.credential_type !== undefined &&
      body.credential_type !== null && {
        credential_type: body.credential_type,
      }),
    ...archivedAtRange,
    ...createdAtRange,
  };

  // Parallel fetch: data rows and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_user_credentials.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        user_id: true,
        user_type: true,
        credential_type: true,
        archived_at: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.healthcare_platform_user_credentials.count({ where }),
  ]);

  // Result transformation, all date fields converted using toISOStringSafe, no as, no Date use
  const data = rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    user_type: row.user_type,
    credential_type: row.credential_type,
    archived_at: toISOStringSafe(row.archived_at),
    created_at: toISOStringSafe(row.created_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(limit)),
    },
    data,
  };
}
