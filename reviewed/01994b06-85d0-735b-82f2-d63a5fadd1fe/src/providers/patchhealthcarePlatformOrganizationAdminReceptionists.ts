import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import { IPageIHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformReceptionist";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * List and search all receptionists with advanced filtering and paging.
 *
 * This operation retrieves a paginated, filtered list of all receptionists in
 * the system, supporting search by email, full name, created_at date range,
 * soft-delete (deleted_at), and advanced sort/pagination. Only accessible to
 * organization admins for their organization.
 *
 * @param props - The props object containing:
 *
 *   - OrganizationAdmin: OrganizationadminPayload for authorization context
 *   - Body: IHealthcarePlatformReceptionist.IRequest containing filters, paging,
 *       and sort
 *
 * @returns Paginated ISummary of matching receptionists and pagination info
 * @throws {Error} If database query or mapping fails
 */
export async function patchhealthcarePlatformOrganizationAdminReceptionists(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformReceptionist.IRequest;
}): Promise<IPageIHealthcarePlatformReceptionist.ISummary> {
  const { body } = props;

  // 1. Parse and default pagination values
  const page = body.page && body.page >= 1 ? body.page : 1;
  const limit = body.limit && body.limit >= 1 ? body.limit : 20;

  // 2. Construct where clause with filters, only using fields that exist in schema
  const where = {
    // Soft delete: if 'deleted_at' filter is provided/null OR omitted (defaults to active only)
    ...(body.deleted_at !== undefined
      ? { deleted_at: body.deleted_at }
      : { deleted_at: null }),
    // Email substring search (case-sensitive; Prisma supports 'contains' for String fields)
    ...(body.email !== undefined &&
      body.email !== null &&
      body.email.length > 0 && {
        email: { contains: body.email },
      }),
    // Full name substring search
    ...(body.full_name !== undefined &&
      body.full_name !== null &&
      body.full_name.length > 0 && {
        full_name: { contains: body.full_name },
      }),
    // created_at range filtering
    ...(body.created_at_from || body.created_at_to
      ? {
          created_at: {
            ...(body.created_at_from !== undefined &&
              body.created_at_from !== null && { gte: body.created_at_from }),
            ...(body.created_at_to !== undefined &&
              body.created_at_to !== null && { lte: body.created_at_to }),
          },
        }
      : {}),
  };

  // Only allow whitelisted sorting fields (those in schema for this table)
  const ALLOWED_SORT_FIELDS = [
    "email",
    "full_name",
    "created_at",
    "updated_at",
  ];
  const sortField =
    body.sortBy && ALLOWED_SORT_FIELDS.includes(body.sortBy)
      ? body.sortBy
      : "created_at";
  const sortDir = body.sortDir === "asc" ? "asc" : "desc";

  // 3. Query paged results and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_receptionists.findMany({
      where,
      orderBy: { [sortField]: sortDir },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    MyGlobal.prisma.healthcare_platform_receptionists.count({ where }),
  ]);

  // 4. Map to ISummary, branding/formatting dates correctly
  const data = rows.map((row) => ({
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    phone: typeof row.phone === "string" ? row.phone : undefined,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));

  // 5. Pagination object (strip brands for assignment)
  const pagination = {
    current: Number(page),
    limit: Number(limit),
    records: Number(total),
    pages: Number(limit) > 0 ? Math.ceil(Number(total) / Number(limit)) : 0,
  };

  return {
    pagination,
    data,
  };
}
