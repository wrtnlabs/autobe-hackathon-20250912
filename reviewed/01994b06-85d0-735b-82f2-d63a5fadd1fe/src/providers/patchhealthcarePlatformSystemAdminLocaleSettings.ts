import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformLocaleSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLocaleSettings";
import { IPageIHealthcarePlatformLocaleSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformLocaleSettings";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and paginate locale settings in healthcare_platform_locale_settings.
 *
 * Retrieves a filtered, paginated list of locale/regionalization settings
 * across the healthcare platform, as visible to system administrators. Supports
 * advanced search criteria including organization, department, language,
 * timezone, and more. Enables management of localization for notifications,
 * scheduling, and regional policies.
 *
 * Authorization: Only accessible to authenticated system admins.
 *
 * @param props - Operation parameters
 * @param props.systemAdmin - The authenticated system admin (must exist and not
 *   be soft-deleted)
 * @param props.body - Search and pagination filters for querying locale
 *   settings
 * @returns Paginated result of locale settings filtered by given criteria
 * @throws {Error} Never throws on empty query, only on DB/system error
 */
export async function patchhealthcarePlatformSystemAdminLocaleSettings(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformLocaleSettings.IRequest;
}): Promise<IPageIHealthcarePlatformLocaleSettings.ISummary> {
  const { body } = props;

  // Pagination defaults and constraints
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Determine sorting field, allow only valid model fields
  const allowedFields = [
    "id",
    "healthcare_platform_organization_id",
    "healthcare_platform_department_id",
    "language",
    "timezone",
    "date_format",
    "time_format",
    "number_format",
    "created_at",
    "updated_at",
  ];
  const userSortField = body.sort?.replace(/^[-+]/, "") ?? "updated_at";
  const sortOrder = body.sort?.startsWith("-") ? "desc" : "asc";
  const field = allowedFields.includes(userSortField)
    ? userSortField
    : "updated_at";

  // Compose where clause
  const where = {
    deleted_at: null,
    ...(body.organization_id !== undefined &&
      body.organization_id !== null && {
        healthcare_platform_organization_id: body.organization_id,
      }),
    ...(body.department_id !== undefined &&
      body.department_id !== null && {
        healthcare_platform_department_id: body.department_id,
      }),
    ...(body.language !== undefined &&
      body.language !== null && { language: body.language }),
    ...(body.timezone !== undefined &&
      body.timezone !== null && { timezone: body.timezone }),
    ...(body.date_format !== undefined &&
      body.date_format !== null && { date_format: body.date_format }),
    ...(body.time_format !== undefined &&
      body.time_format !== null && { time_format: body.time_format }),
    ...(body.number_format !== undefined &&
      body.number_format !== null && { number_format: body.number_format }),
  };

  // Query
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_locale_settings.findMany({
      where,
      orderBy: { [field]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.healthcare_platform_locale_settings.count({ where }),
  ]);

  // Build result
  const data = rows.map((row) => ({
    id: row.id,
    healthcare_platform_organization_id:
      row.healthcare_platform_organization_id ?? null,
    healthcare_platform_department_id:
      row.healthcare_platform_department_id ?? null,
    language: row.language,
    timezone: row.timezone,
    date_format: row.date_format,
    time_format: row.time_format,
    number_format: row.number_format,
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
