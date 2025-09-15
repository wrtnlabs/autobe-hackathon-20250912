import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformResourceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformResourceSchedule";
import { IPageIHealthcarePlatformResourceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformResourceSchedule";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * List all resource schedules with search and pagination in
 * healthcare_platform_resource_schedules table.
 *
 * Allows system-level or organization-level administrators to list all
 * configured resource schedules, with support for advanced filtering (by
 * organization, resource type or ID, availability windows, recurrence), paging,
 * and sorting. Only non-soft-deleted records will be returned.
 *
 * The response provides schedule metadata needed for administrative decision
 * making and calendar UI construction. Security is enforced by role-based
 * access restriction.
 *
 * @param props - The request parameter containing authentication payload and
 *   search/pagination body structure.
 * @param props.systemAdmin - The authenticated SystemadminPayload for system
 *   admin role
 * @param props.body - Resource schedule search, filtering, pagination, and sort
 *   specification (IHealthcarePlatformResourceSchedule.IRequest)
 * @returns Page of resource schedules and pagination metadata
 * @throws {Error} If there is a database error or invalid input
 */
export async function patchhealthcarePlatformSystemAdminResourceSchedules(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformResourceSchedule.IRequest;
}): Promise<IPageIHealthcarePlatformResourceSchedule> {
  const { body } = props;
  // Pagination defaults
  const pageRaw = body.page;
  const limitRaw = body.limit;
  // Both page and limit in IPageIHealthcarePlatformResourceSchedule use branded number & tags.Type<"int32"> & tags.Minimum<0>
  // so must cast to plain number for calculation, then assign as needed
  const page = typeof pageRaw === "number" && pageRaw >= 1 ? pageRaw : 1;
  const limit =
    typeof limitRaw === "number" && limitRaw >= 1 && limitRaw <= 1000
      ? limitRaw
      : 20;
  const skip = (page - 1) * limit;

  // Build filters for where clause, always filter out soft-deleted
  const where: Record<string, unknown> = { deleted_at: null };
  if (body.organization_id !== undefined && body.organization_id !== null) {
    where["healthcare_platform_organization_id"] = body.organization_id;
  }
  if (body.resource_type !== undefined && body.resource_type !== null) {
    where["resource_type"] = body.resource_type;
  }
  if (body.resource_id !== undefined && body.resource_id !== null) {
    where["resource_id"] = body.resource_id;
  }
  // Time window filters for available_start_time
  if (
    (body.available_start_time_from !== undefined &&
      body.available_start_time_from !== null) ||
    (body.available_start_time_to !== undefined &&
      body.available_start_time_to !== null)
  ) {
    const filter: Record<string, string> = {};
    if (
      body.available_start_time_from !== undefined &&
      body.available_start_time_from !== null
    ) {
      filter.gte = body.available_start_time_from;
    }
    if (
      body.available_start_time_to !== undefined &&
      body.available_start_time_to !== null
    ) {
      filter.lte = body.available_start_time_to;
    }
    where["available_start_time"] = filter;
  }
  // Time window filters for available_end_time
  if (
    (body.available_end_time_from !== undefined &&
      body.available_end_time_from !== null) ||
    (body.available_end_time_to !== undefined &&
      body.available_end_time_to !== null)
  ) {
    const filter: Record<string, string> = {};
    if (
      body.available_end_time_from !== undefined &&
      body.available_end_time_from !== null
    ) {
      filter.gte = body.available_end_time_from;
    }
    if (
      body.available_end_time_to !== undefined &&
      body.available_end_time_to !== null
    ) {
      filter.lte = body.available_end_time_to;
    }
    where["available_end_time"] = filter;
  }
  if (
    body.recurrence_pattern !== undefined &&
    body.recurrence_pattern !== null
  ) {
    where["recurrence_pattern"] = body.recurrence_pattern;
  }
  if (body.exception_dates !== undefined && body.exception_dates !== null) {
    where["exception_dates"] = body.exception_dates;
  }

  // Sorting logic: parse field and direction, support only listed schema fields
  const allowedSortFields = [
    "created_at",
    "updated_at",
    "available_start_time",
    "available_end_time",
    "resource_type",
    "resource_id",
    "healthcare_platform_organization_id",
    "recurrence_pattern",
    "exception_dates",
  ];
  let orderBy: Record<string, "asc" | "desc"> = { created_at: "desc" };
  if (body.sort) {
    const sortParts = body.sort.trim().split(/\s+/);
    const sortField = sortParts[0];
    let sortDir: "asc" | "desc" = "asc";
    if (
      sortParts.length >= 2 &&
      (sortParts[1].toLowerCase() === "asc" ||
        sortParts[1].toLowerCase() === "desc")
    ) {
      sortDir = sortParts[1].toLowerCase() as "asc" | "desc";
    }
    if (allowedSortFields.includes(sortField)) {
      orderBy = { [sortField]: sortDir };
    }
  }

  // Fetch total count and data in parallel
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_resource_schedules.count({ where }),
    MyGlobal.prisma.healthcare_platform_resource_schedules.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
  ]);

  // Convert all fields for output type
  const data: IHealthcarePlatformResourceSchedule[] = rows.map((row) => {
    const output: IHealthcarePlatformResourceSchedule = {
      id: row.id,
      healthcare_platform_organization_id:
        row.healthcare_platform_organization_id,
      resource_type: row.resource_type,
      resource_id: row.resource_id,
      available_start_time: row.available_start_time,
      available_end_time: row.available_end_time,
      recurrence_pattern: row.recurrence_pattern ?? undefined,
      exception_dates: row.exception_dates ?? undefined,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at:
        row.deleted_at !== null && row.deleted_at !== undefined
          ? toISOStringSafe(row.deleted_at)
          : undefined,
    };
    return output;
  });

  // Calculate page info with plain numbers
  const recordsCount = typeof total === "number" ? total : 0;
  const pages = limit > 0 ? Math.ceil(recordsCount / limit) : 1;
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: recordsCount,
      pages: pages,
    },
    data,
  };
}
