import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsReport";
import { IPageIHealthcarePlatformAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAnalyticsReport";
import { TechnicianPayload } from "../decorators/payload/TechnicianPayload";

/**
 * Search and retrieve paginated analytics report records with filters and
 * sorting.
 *
 * Retrieves a filtered, paginated list of analytics reports definitions to
 * which the technician user has access, based on search, filter, and sort
 * criteria specified in the request. Operates on the
 * healthcare_platform_analytics_reports table and supports searching,
 * filtering, and sorting by name, creator, organization, department, and
 * activity status. Provides paginated output and strict field validation per
 * API contract.
 *
 * @param props - The request properties including the technician payload
 *   (authentication) and search/filter/sort/request body
 * @param props.technician - The authenticated technician user making this
 *   request
 * @param props.body - Search/filter/pagination/sort configuration
 *   (IHealthcarePlatformAnalyticsReport.IRequest)
 * @returns Paginated analytics report list with pagination info
 * @throws {Error} For database or query errors
 */
export async function patchhealthcarePlatformTechnicianAnalyticsReports(props: {
  technician: TechnicianPayload;
  body: IHealthcarePlatformAnalyticsReport.IRequest;
}): Promise<IPageIHealthcarePlatformAnalyticsReport> {
  const { technician, body } = props;
  const {
    name,
    created_by_user_id,
    organization_id,
    department_id,
    is_active,
    page,
    limit,
    sort,
    order,
  } = body;

  // Only allow specific sort fields
  const allowedSortFields = ["name", "created_at", "updated_at"];
  const sortBy: "name" | "created_at" | "updated_at" =
    allowedSortFields.includes(sort ?? "")
      ? (sort as "name" | "created_at" | "updated_at")
      : "created_at";
  const orderBy: Prisma.SortOrder = order === "asc" ? "asc" : "desc";
  const pageNum = typeof page === "number" && page > 0 ? page : 1;
  const limitNum = typeof limit === "number" && limit > 0 ? limit : 20;
  const skip = (pageNum - 1) * limitNum;

  // Build Prisma where clause safely with verified fields
  const where = {
    ...(typeof name === "string" &&
      name.length > 0 && { name: { contains: name } }),
    ...(typeof created_by_user_id === "string" &&
      created_by_user_id.length > 0 && { created_by_user_id }),
    ...(typeof organization_id === "string" &&
      organization_id.length > 0 && { organization_id }),
    ...(typeof department_id === "string" &&
      department_id.length > 0 && { department_id }),
    ...(typeof is_active === "boolean" && { is_active }),
  };

  // Define orderBy inline for Prisma (using type assertion for computed property)
  const orderByObj = [
    {
      [sortBy as string]: orderBy,
    },
  ];

  // Fetch paginated records and total count simultaneously
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_analytics_reports.findMany({
      where,
      orderBy: orderByObj,
      skip,
      take: limitNum,
    }),
    MyGlobal.prisma.healthcare_platform_analytics_reports.count({ where }),
  ]);

  const data = rows.map((r) => {
    return {
      id: r.id,
      created_by_user_id: r.created_by_user_id,
      organization_id: r.organization_id,
      department_id:
        typeof r.department_id === "string" && r.department_id.length > 0
          ? r.department_id
          : r.department_id === null
            ? null
            : undefined,
      name: r.name,
      description:
        typeof r.description === "string" && r.description.length > 0
          ? r.description
          : r.description === null
            ? null
            : undefined,
      template_config_json: r.template_config_json,
      is_active: r.is_active,
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
      deleted_at: r.deleted_at
        ? toISOStringSafe(r.deleted_at)
        : r.deleted_at === null
          ? null
          : undefined,
    };
  });

  // Pagination metadata with safe integer unbranding
  const pagination = {
    current: Number(pageNum),
    limit: Number(limitNum),
    records: Number(total),
    pages: Math.ceil(total / limitNum),
  };

  return {
    pagination,
    data,
  };
}
