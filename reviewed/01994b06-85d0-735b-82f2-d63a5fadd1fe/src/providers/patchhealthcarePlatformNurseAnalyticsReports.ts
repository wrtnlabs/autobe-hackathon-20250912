import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsReport";
import { IPageIHealthcarePlatformAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAnalyticsReport";
import { NursePayload } from "../decorators/payload/NursePayload";

/**
 * Search and retrieve paginated analytics report records
 * (IHealthcarePlatformAnalyticsReport) with filters and sorting.
 *
 * Retrieves a filtered, paginated list of analytics report definitions
 * available to the nurse. Supports searching, filtering, sorting (by allowed
 * report attributes), and RBAC enforcement to show only reports created by the
 * logged-in nurse. Returns paginated records and pagination metadata as
 * IPageIHealthcarePlatformAnalyticsReport.
 *
 * @param props - Request properties
 * @param props.nurse - The authenticated nurse (payload: id, type)
 * @param props.body - Search, filter, and pagination configuration
 * @returns Paginated analytics report collection matching all filters and sort
 *   criteria
 * @throws {Error} If underlying database error or implementation error occurs
 */
export async function patchhealthcarePlatformNurseAnalyticsReports(props: {
  nurse: NursePayload;
  body: IHealthcarePlatformAnalyticsReport.IRequest;
}): Promise<IPageIHealthcarePlatformAnalyticsReport> {
  const { nurse, body } = props;
  // Pagination (strip branding for skip/take calculation)
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (Number(page) - 1) * Number(limit);

  // Build the Prisma where clause enforcing RBAC & requested filters
  const where = {
    created_by_user_id: nurse.id,
    ...(body.name !== undefined &&
      body.name !== null &&
      body.name !== "" && {
        name: { contains: body.name },
      }),
    ...(body.organization_id !== undefined &&
      body.organization_id !== null && {
        organization_id: body.organization_id,
      }),
    ...(body.department_id !== undefined &&
      body.department_id !== null && {
        department_id: body.department_id,
      }),
    ...(typeof body.is_active === "boolean" && { is_active: body.is_active }),
  };

  // Sorting - allow-field narrowing only for known safe sort fields
  const allowedSortFields = ["created_at", "name", "updated_at"];
  let sortField =
    body.sort !== undefined &&
    body.sort !== null &&
    allowedSortFields.includes(body.sort)
      ? body.sort
      : "created_at";
  let order: "asc" | "desc" =
    body.order === "asc" || body.order === "desc" ? body.order : "desc";

  // Query data and total record count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_analytics_reports.findMany({
      where,
      orderBy: { [sortField]: order },
      skip: Number(skip),
      take: Number(limit),
    }),
    MyGlobal.prisma.healthcare_platform_analytics_reports.count({ where }),
  ]);

  // Transform rows to API DTOs (no Date)
  const data = rows.map((row) => {
    return {
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
    };
  });

  // Return paginated output per DTO requirements
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
