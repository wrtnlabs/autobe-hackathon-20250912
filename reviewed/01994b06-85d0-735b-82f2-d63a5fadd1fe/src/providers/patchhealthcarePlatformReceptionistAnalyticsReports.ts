import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsReport";
import { IPageIHealthcarePlatformAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAnalyticsReport";
import { ReceptionistPayload } from "../decorators/payload/ReceptionistPayload";

/**
 * Search and retrieve paginated analytics report records
 * (IHealthcarePlatformAnalyticsReport) with filters and sorting.
 *
 * Retrieves a filtered, paginated list of analytics report definitions
 * available to a receptionist user. NO explicit receptionist-organization
 * scoping is enforced as healthcare_platform_receptionists has no
 * organization_id; report visibility is determined by filters in request body
 * only. Supports searching, filter, sort, and pagination. Utilizes exact
 * filtering and conversion of all date/time fields to ISO 8601 string format.
 * Returns data in a consistent page structure for reporting UIs.
 *
 * @param props - Object containing the receptionist authorization payload and
 *   search/filter body.
 * @param props.receptionist - Authenticated receptionist payload (id, type)
 * @param props.body - Search, filter, pagination, and sort configuration.
 * @returns Paginated list of analytics reports, as
 *   IPageIHealthcarePlatformAnalyticsReport.
 * @throws {Error} If inputs are invalid or a database error occurs.
 */
export async function patchhealthcarePlatformReceptionistAnalyticsReports(props: {
  receptionist: ReceptionistPayload;
  body: IHealthcarePlatformAnalyticsReport.IRequest;
}): Promise<IPageIHealthcarePlatformAnalyticsReport> {
  const { body } = props;

  // Step 1: Pagination setup
  const rawPage = body.page ?? 1;
  const rawLimit = body.limit ?? 20;
  const page = Math.max(1, Number(rawPage));
  const limit = Math.min(Math.max(1, Number(rawLimit)), 100); // Enforce max page size
  const skip = (page - 1) * limit;

  // Step 2: Build where clause for Prisma query
  const where: Record<string, unknown> = {
    deleted_at: null,
    ...(body.name !== undefined &&
      body.name !== null &&
      typeof body.name === "string" &&
      body.name.length > 0 && {
        name: { contains: body.name },
      }),
    ...(body.created_by_user_id !== undefined &&
      body.created_by_user_id !== null && {
        created_by_user_id: body.created_by_user_id,
      }),
    ...(body.department_id !== undefined &&
      body.department_id !== null && {
        department_id: body.department_id,
      }),
    ...(body.organization_id !== undefined &&
      body.organization_id !== null && {
        organization_id: body.organization_id,
      }),
    ...(body.is_active !== undefined &&
      body.is_active !== null && {
        is_active: body.is_active,
      }),
  };

  // Only allow sorting by 'created_at' or 'name'
  type SortField = "created_at" | "name";
  let sortField: SortField = "created_at";
  if (body.sort && (body.sort === "created_at" || body.sort === "name")) {
    sortField = body.sort as SortField;
  }
  const sortOrder = body.order === "asc" ? "asc" : "desc";

  // Query + count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_analytics_reports.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.healthcare_platform_analytics_reports.count({ where }),
  ]);

  const data: IHealthcarePlatformAnalyticsReport[] = rows.map((row) => ({
    id: row.id,
    created_by_user_id: row.created_by_user_id,
    organization_id: row.organization_id,
    department_id: row.department_id ?? undefined,
    name: row.name,
    description: row.description ?? undefined,
    template_config_json: row.template_config_json,
    is_active: row.is_active,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
