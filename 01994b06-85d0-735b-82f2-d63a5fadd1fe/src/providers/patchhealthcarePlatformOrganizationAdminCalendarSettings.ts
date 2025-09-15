import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformCalendarSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformCalendarSetting";
import { IPageIHealthcarePlatformCalendarSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformCalendarSetting";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and retrieve a paginated, filtered list of calendar settings from
 * healthcare_platform_calendar_settings.
 *
 * This operation retrieves a filtered, paginated list of healthcare platform
 * calendar settings, which govern scheduling rules at the organization or
 * resource (provider, room, equipment) levels. Supports advanced search,
 * filtering, sorting, and pagination via structured request body. Authorization
 * required (organizationadmin).
 *
 * @param props - Input props containing:
 *
 *   - OrganizationAdmin: OrganizationadminPayload
 *   - Body: IHealthcarePlatformCalendarSetting.IRequest (search/filter/pagination
 *       params)
 *
 * @returns Paginated summary list of calendar settings meeting filter and
 *   pagination criteria.
 * @throws {Error} If Prisma/database errors occur or unknown issues arise
 */
export async function patchhealthcarePlatformOrganizationAdminCalendarSettings(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformCalendarSetting.IRequest;
}): Promise<IPageIHealthcarePlatformCalendarSetting.ISummary> {
  const { organizationAdmin, body } = props;

  // Defensive: sanitize pagination (always >=0)
  const pageRaw = body.page !== undefined && body.page !== null ? body.page : 0;
  const page =
    typeof pageRaw === "number" && pageRaw >= 0 ? Number(pageRaw) : 0;
  const limitRaw =
    body.limit !== undefined && body.limit !== null ? body.limit : 20;
  const limit =
    typeof limitRaw === "number" && limitRaw > 0 ? Number(limitRaw) : 20;

  // Allowed sort fields (avoid injection); fallback to created_at
  const allowedSortFields = [
    "created_at",
    "resource_type",
    "healthcare_platform_organization_id",
    "min_lead_time_minutes",
    "min_cancel_window_minutes",
  ];
  const isValidSortField = (field: unknown): field is string =>
    typeof field === "string" && allowedSortFields.includes(field);
  const sortField = isValidSortField(body.sort_by)
    ? body.sort_by
    : "created_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  // Build dynamic filters; skip filters that are undefined/null
  const where: Record<string, unknown> = {
    healthcare_platform_organization_id: organizationAdmin.id,
    deleted_at: null,
    ...(body.resource_type !== undefined &&
      body.resource_type !== null && {
        resource_type: body.resource_type,
      }),
    ...(body.resource_id !== undefined &&
      body.resource_id !== null && {
        resource_id: body.resource_id,
      }),
    ...(body.business_days !== undefined &&
      body.business_days !== null && {
        business_days: JSON.stringify(body.business_days),
      }),
    ...(body.availability_hours !== undefined &&
      body.availability_hours !== null && {
        availability_hours: body.availability_hours,
      }),
    ...(body.min_lead_time_minutes !== undefined &&
      body.min_lead_time_minutes !== null && {
        min_lead_time_minutes: body.min_lead_time_minutes,
      }),
    ...(body.min_cancel_window_minutes !== undefined &&
      body.min_cancel_window_minutes !== null && {
        min_cancel_window_minutes: body.min_cancel_window_minutes,
      }),
    ...(body.blackout_dates !== undefined &&
      body.blackout_dates !== null && {
        blackout_dates: body.blackout_dates,
      }),
    ...(body.post_appointment_survey_enabled !== undefined &&
      body.post_appointment_survey_enabled !== null && {
        post_appointment_survey_enabled: body.post_appointment_survey_enabled,
      }),
  };

  // Get paginated records and total count concurrently
  const [records, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_calendar_settings.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip: page * limit,
      take: limit,
    }),
    MyGlobal.prisma.healthcare_platform_calendar_settings.count({ where }),
  ]);

  // Output shape: IPageIHealthcarePlatformCalendarSetting.ISummary
  const data: IHealthcarePlatformCalendarSetting.ISummary[] = records.map(
    (record) => ({
      id: record.id,
      healthcare_platform_organization_id:
        record.healthcare_platform_organization_id,
      resource_type: record.resource_type,
      resource_id: record.resource_id ?? undefined,
      business_days: record.business_days,
      availability_hours: record.availability_hours,
      min_lead_time_minutes: record.min_lead_time_minutes,
      min_cancel_window_minutes: record.min_cancel_window_minutes,
      blackout_dates: record.blackout_dates ?? undefined,
      post_appointment_survey_enabled: record.post_appointment_survey_enabled,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
      deleted_at: record.deleted_at
        ? toISOStringSafe(record.deleted_at)
        : undefined,
    }),
  );

  // Compute pagination object (strip all branding using Number())
  const pagination = {
    current: Number(page),
    limit: Number(limit),
    records: Number(total),
    pages: limit > 0 ? Math.ceil(total / limit) : 0,
  };

  return {
    pagination,
    data,
  };
}
