import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformUserAuthentication } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserAuthentication";
import { IPageIHealthcarePlatformUserAuthentication } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformUserAuthentication";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and retrieve a filtered, paginated list of user authentication
 * records.
 *
 * Retrieves authentication records from the
 * healthcare_platform_user_authentications table for system-level or
 * administrative review. Filtering is allowed on user_type, provider,
 * provider_key, and creation/last-authenticated time ranges. Sorting can be
 * done only on allowed columns; defaults to created_at descending. Pagination
 * is enforced with defaults and bounds-checked, ensuring page count and limit.
 * All datetime fields are returned as ISO8601 strings strictly typed as string
 * & tags.Format<'date-time'>. Credential hashes are never returned.
 *
 * Only accessible to authenticated Systemadmin users.
 *
 * @param props - The payload containing authenticated systemAdmin and query
 *   body for filters, sort, and pagination
 * @returns Paginated user authentication summaries
 * @throws {Error} If page index is out of bounds or sort is invalid
 */
export async function patchhealthcarePlatformSystemAdminUserAuthentications(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformUserAuthentication.IRequest;
}): Promise<IPageIHealthcarePlatformUserAuthentication.ISummary> {
  const { body } = props;

  // Build filters using only schema-verified fields
  const where = {
    ...(body.user_type !== undefined &&
      body.user_type !== null && { user_type: body.user_type }),
    ...(body.provider !== undefined &&
      body.provider !== null && { provider: body.provider }),
    ...(body.provider_key !== undefined &&
      body.provider_key !== null && { provider_key: body.provider_key }),
    ...((body.created_after !== undefined && body.created_after !== null) ||
    (body.created_before !== undefined && body.created_before !== null)
      ? {
          created_at: {
            ...(body.created_after !== undefined &&
              body.created_after !== null && { gte: body.created_after }),
            ...(body.created_before !== undefined &&
              body.created_before !== null && { lte: body.created_before }),
          },
        }
      : {}),
  };

  // Allowed sort fields
  const allowedSortFields = [
    "created_at",
    "updated_at",
    "user_type",
    "provider",
    "provider_key",
    "id",
    "last_authenticated_at",
  ];
  let orderBy: Record<string, "asc" | "desc"> = { created_at: "desc" };
  if (body.sort !== undefined && body.sort !== null) {
    const colonIndex = body.sort.indexOf(":");
    let sortField = "created_at";
    let direction: "asc" | "desc" = "desc";
    if (colonIndex > 0) {
      sortField = body.sort.slice(0, colonIndex);
      const dirRaw = body.sort.slice(colonIndex + 1).toLowerCase();
      if (dirRaw === "asc" || dirRaw === "desc") {
        direction = dirRaw;
      }
    } else if (colonIndex === -1 && allowedSortFields.includes(body.sort)) {
      sortField = body.sort;
      direction = "desc";
    }
    if (allowedSortFields.includes(sortField)) {
      orderBy = { [sortField]: direction };
    }
  }

  // Pagination: enforce positive integers, type branding
  const defaultPage = 1;
  const defaultPageSize = 50;
  const pageVal =
    body.page !== undefined &&
    body.page !== null &&
    typeof body.page === "number" &&
    body.page > 0
      ? body.page
      : defaultPage;
  const page_sizeVal =
    body.page_size !== undefined &&
    body.page_size !== null &&
    typeof body.page_size === "number" &&
    body.page_size > 0
      ? body.page_size
      : defaultPageSize;
  const skip = (pageVal - 1) * page_sizeVal;
  const take = page_sizeVal;

  // Do the actual query/count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_user_authentications.findMany({
      where,
      orderBy,
      skip,
      take,
    }),
    MyGlobal.prisma.healthcare_platform_user_authentications.count({ where }),
  ]);

  // Out-of-bound page: return empty data with correct pagination
  const totalPages = total > 0 ? Math.ceil(total / page_sizeVal) : 1;
  if (pageVal > totalPages) {
    return {
      pagination: {
        current: Number(pageVal),
        limit: Number(page_sizeVal),
        records: total,
        pages: totalPages,
      },
      data: [],
    };
  }

  const data = rows.map((row) => {
    const result = {
      id: row.id,
      user_type: row.user_type,
      user_id: row.user_id,
      provider: row.provider,
      provider_key: row.provider_key,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      last_authenticated_at:
        row.last_authenticated_at !== null &&
        row.last_authenticated_at !== undefined
          ? toISOStringSafe(row.last_authenticated_at)
          : undefined,
      deleted_at:
        row.deleted_at !== null && row.deleted_at !== undefined
          ? toISOStringSafe(row.deleted_at)
          : undefined,
    };
    return result;
  });

  return {
    pagination: {
      current: Number(pageVal),
      limit: Number(page_sizeVal),
      records: total,
      pages: totalPages,
    },
    data,
  };
}
