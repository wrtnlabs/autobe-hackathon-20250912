import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformLocaleSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLocaleSettings";
import { IPageIHealthcarePlatformLocaleSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformLocaleSettings";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and paginate locale settings in healthcare_platform_locale_settings.
 *
 * This operation retrieves a paginated and filtered list of
 * locale/regionalization settings (language, timezone, date/time/number format)
 * for an organization. It allows an authenticated organization admin to filter
 * results by department, language, timezone, and other criteria, supporting
 * multi-lingual and regional workflow customization across the healthcare
 * platform. Only settings for the admin's own organization are returned,
 * ensuring proper RBAC. Results are presented as summary records with
 * pagination information suitable for management UIs and list views.
 *
 * @param props - The request parameter object
 * @param props.organizationAdmin - Authenticated organization admin context
 *   (must match org from settings)
 * @param props.body - Filter, sort, and pagination options
 * @returns Paginated list of locale settings
 * @throws {Error} If any database or internal error occurs
 */
export async function patchhealthcarePlatformOrganizationAdminLocaleSettings(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformLocaleSettings.IRequest;
}): Promise<IPageIHealthcarePlatformLocaleSettings.ISummary> {
  const { organizationAdmin, body } = props;

  // Pagination
  const limit = (body.limit !== undefined &&
  typeof body.limit === "number" &&
  body.limit >= 1
    ? body.limit
    : 20) as number & tags.Type<"int32"> & tags.Minimum<1> as number;
  const page = (body.page !== undefined &&
  typeof body.page === "number" &&
  body.page >= 1
    ? body.page
    : 1) as number & tags.Type<"int32"> & tags.Minimum<1> as number;
  const skip = (page - 1) * limit;

  // Allowed sort fields; fallback to created_at desc
  const allowedSorts = [
    "id",
    "language",
    "timezone",
    "date_format",
    "time_format",
    "number_format",
  ];
  let orderByField: (typeof allowedSorts)[number] | "created_at" = "created_at";
  let orderByDir: "asc" | "desc" = "desc";
  if (typeof body.sort === "string" && body.sort.length > 0) {
    let sort = body.sort;
    let sortField = sort;
    if (/^[+-]/.test(sort)) sortField = sort.slice(1);
    if (allowedSorts.includes(sortField)) {
      orderByField = sortField as typeof orderByField;
      if (sort[0] === "-") orderByDir = "desc";
      else if (sort[0] === "+") orderByDir = "asc";
      else orderByDir = "asc";
    }
  }

  // Build WHERE (all filters optional except enforced org)
  const where = {
    deleted_at: null,
    healthcare_platform_organization_id: organizationAdmin.id,
    ...(body.department_id !== undefined && {
      healthcare_platform_department_id: body.department_id,
    }),
    ...(body.language !== undefined && { language: body.language }),
    ...(body.timezone !== undefined && { timezone: body.timezone }),
    ...(body.date_format !== undefined && { date_format: body.date_format }),
    ...(body.time_format !== undefined && { time_format: body.time_format }),
    ...(body.number_format !== undefined && {
      number_format: body.number_format,
    }),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_locale_settings.findMany({
      where,
      orderBy: { [orderByField]: orderByDir }, // always inline
      skip,
      take: limit,
    }),
    MyGlobal.prisma.healthcare_platform_locale_settings.count({ where }),
  ]);

  const data = rows.map((rec) => ({
    id: rec.id,
    healthcare_platform_organization_id:
      rec.healthcare_platform_organization_id ?? null,
    healthcare_platform_department_id:
      rec.healthcare_platform_department_id ?? null,
    language: rec.language,
    timezone: rec.timezone,
    date_format: rec.date_format,
    time_format: rec.time_format,
    number_format: rec.number_format,
  }));

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
