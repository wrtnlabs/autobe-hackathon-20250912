import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import { IPageIHealthcarePlatformOrganizationadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformOrganizationadmin";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and retrieve Organization Admin user records with advanced filtering
 * and pagination.
 *
 * Provides filtered, paginated search over the
 * healthcare_platform_organizationadmins table for authorized system admins,
 * allowing query by name, email, and activity status, as well as smart sort and
 * pagination. Computes account status based on presence of deleted_at field.
 *
 * Only accessible to systemAdmin users. Sensitive identity fields are omitted.
 * Results are suitable for audit and management dashboards. Returns a summary
 * record for each account, never auth credentials. Pagination info blends
 * business context and record structure.
 *
 * @param props - The request context and filter/sort/pagination parameters.
 * @param props.systemAdmin - The authenticated system admin user (JWT payload).
 * @param props.body - Filter, sort, and pagination criteria for search.
 * @returns Paginated, filtered Organization Admin summaries matching search.
 * @throws {Error} If unauthorized, query inputs invalid, or business logic
 *   fails.
 */
export async function patchhealthcarePlatformSystemAdminOrganizationadmins(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformOrganizationAdmin.IRequest;
}): Promise<IPageIHealthcarePlatformOrganizationadmin.ISummary> {
  const { systemAdmin, body } = props;

  // 1. Authorization - must provide valid systemAdmin payload/role
  if (!systemAdmin || systemAdmin.type !== "systemAdmin") {
    throw new Error(
      "Unauthorized: Only system admin role may access this endpoint.",
    );
  }

  // 2. Pagination defaults (strict 1-based, bounded)
  const page = body.page ?? 1;
  const limit = body.limit ?? 25;

  // 3. Validate sort/order by enum
  const validSortFields: ("created_at" | "email" | "full_name")[] = [
    "created_at",
    "email",
    "full_name",
  ];
  let sortField = body.sort ?? "created_at";
  if (!validSortFields.includes(sortField)) sortField = "created_at";
  let sortOrder: "asc" | "desc" = body.order ?? "desc";
  if (sortOrder !== "asc" && sortOrder !== "desc") sortOrder = "desc";

  // 4. Compute offset and query conditions
  const offset = (Number(page) - 1) * Number(limit);
  // Strict where clause construction
  const where = {
    ...(body.email !== undefined &&
      body.email !== null && {
        email: { contains: body.email },
      }),
    ...(body.full_name !== undefined &&
      body.full_name !== null && {
        full_name: { contains: body.full_name },
      }),
    // is_active filter: true = only those with deleted_at: null; false = only deleted_at != null
    ...(body.is_active === true && { deleted_at: null }),
    ...(body.is_active === false && { NOT: { deleted_at: null } }),
  };

  // 5. Run query and count concurrently
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_organizationadmins.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip: offset,
      take: Number(limit),
    }),
    MyGlobal.prisma.healthcare_platform_organizationadmins.count({
      where,
    }),
  ]);

  // 6. Transform rows to summaries (mapping status as literal field)
  const data = rows.map((row) => ({
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    status: row.deleted_at === null ? "active" : "archived",
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));

  // 7. Structure pagination with correct number type branding
  const currentPage = Number(page);
  const perPage = Number(limit);
  const pageCount = Math.ceil(total / (perPage > 0 ? perPage : 1));

  return {
    pagination: {
      current: currentPage,
      limit: perPage,
      records: total,
      pages: pageCount,
    },
    data,
  };
}
