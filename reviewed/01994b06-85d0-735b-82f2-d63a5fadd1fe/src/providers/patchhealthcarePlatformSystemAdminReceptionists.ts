import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import { IPageIHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformReceptionist";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * List and search all receptionists with advanced filtering and paging.
 *
 * Retrieves a paginated, filtered, and optionally sorted list of all
 * receptionists in the system for system administrators. Supports advanced
 * search parameters, substring matching, and date filtering. Results include
 * summary data for each receptionist, optimized for management views and
 * compliance workflows.
 *
 * @param props - Object containing:
 *
 *   - SystemAdmin: Authenticated system administrator (validated upstream)
 *   - Body: Search, filter, pagination, and sorting parameters
 *
 * @returns Paginated list of receptionist summary records matching
 *   search/filter criteria
 * @throws {Error} If database errors occur or parameters are invalid
 */
export async function patchhealthcarePlatformSystemAdminReceptionists(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformReceptionist.IRequest;
}): Promise<IPageIHealthcarePlatformReceptionist.ISummary> {
  const { body } = props;
  // Set defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  // Sort field restrictions
  const validSortFields = ["email", "full_name", "created_at", "updated_at"];
  const sortBy =
    body.sortBy && validSortFields.includes(body.sortBy)
      ? body.sortBy
      : "created_at";
  const sortDir: "asc" | "desc" = body.sortDir === "asc" ? "asc" : "desc";

  // Build where filter (functional, immutable)
  const where = {
    ...(body.email && { email: { contains: body.email } }),
    ...(body.full_name && { full_name: { contains: body.full_name } }),
    ...(body.created_at_from !== undefined || body.created_at_to !== undefined
      ? {
          created_at: {
            ...(body.created_at_from !== undefined && {
              gte: body.created_at_from,
            }),
            ...(body.created_at_to !== undefined && {
              lte: body.created_at_to,
            }),
          },
        }
      : {}),
    ...(body.deleted_at !== undefined
      ? { deleted_at: body.deleted_at }
      : { deleted_at: null }),
  };

  // Run both queries in parallel for efficiency
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_receptionists.findMany({
      where,
      orderBy: { [sortBy]: sortDir },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.healthcare_platform_receptionists.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Number(limit) > 0 ? Math.ceil(Number(total) / Number(limit)) : 0,
    },
    data: rows.map((row) => ({
      id: row.id,
      email: row.email,
      full_name: row.full_name,
      phone: row.phone ?? undefined,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
