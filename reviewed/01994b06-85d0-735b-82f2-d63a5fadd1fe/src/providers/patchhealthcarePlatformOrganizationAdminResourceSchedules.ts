import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformResourceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformResourceSchedule";
import { IPageIHealthcarePlatformResourceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformResourceSchedule";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * List all resource schedules with search and pagination in
 * healthcare_platform_resource_schedules table.
 *
 * Allows organization administrators to list all configured resource schedules
 * for their own organization, supporting advanced filtering (resource type, id,
 * availability windows, recurrence, exceptions), paging, and sorting. Only
 * non-soft-deleted records are returned. The result shape is strictly bounded
 * to IPageIHealthcarePlatformResourceSchedule and performs all necessary
 * type-safe transformations.
 *
 * @param props - Function input.
 * @param props.organizationAdmin - The authenticated organization admin making
 *   the request. Enforces strict organization boundary.
 * @param props.body - Scheduling and filtering parameters, as per
 *   IHealthcarePlatformResourceSchedule.IRequest.
 * @returns A paged set of resource schedule records scoped to the admin's
 *   organization and search criteria.
 * @throws {Error} If required fields are missing or an unknown error occurs
 *   during query execution.
 */
export async function patchhealthcarePlatformOrganizationAdminResourceSchedules(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformResourceSchedule.IRequest;
}): Promise<IPageIHealthcarePlatformResourceSchedule> {
  const { organizationAdmin, body } = props;
  // Enforce organization boundary: even if body requests a different org, force to admin's organization
  const orgId = organizationAdmin.id;

  // Handle pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const safeLimit = Math.min(Number(limit), 1000);
  const safePage = Math.max(Number(page), 1);
  const skip = (safePage - 1) * safeLimit;

  // Safelist fields allowed in orderBy
  const allowedOrderBy = [
    "available_start_time",
    "available_end_time",
    "resource_type",
    "resource_id",
    "created_at",
    "updated_at",
  ];
  let sortField = "created_at";
  let sortDir: "asc" | "desc" = "desc";
  if (body.sort && typeof body.sort === "string") {
    const m = body.sort.trim().match(/^([\w_]+)\s*(asc|desc)?$/i);
    if (m) {
      const candidate = m[1];
      if (allowedOrderBy.includes(candidate)) {
        sortField = candidate;
        sortDir = m[2]?.toLowerCase() === "asc" ? "asc" : "desc";
      }
    }
  }

  // WHERE clause (all filters optional except org and deleted_at)
  const where: Record<string, unknown> = {
    deleted_at: null,
    healthcare_platform_organization_id: orgId,
    ...(body.resource_type !== undefined &&
      body.resource_type !== null && {
        resource_type: body.resource_type,
      }),
    ...(body.resource_id !== undefined &&
      body.resource_id !== null && {
        resource_id: body.resource_id,
      }),
    ...(body.available_start_time_from !== undefined &&
      body.available_start_time_from !== null && {
        available_start_time: { gte: body.available_start_time_from },
      }),
    ...(body.available_start_time_to !== undefined &&
      body.available_start_time_to !== null && {
        available_start_time: {
          ...(body.available_start_time_from !== undefined &&
            body.available_start_time_from !== null && {
              gte: body.available_start_time_from,
            }),
          lte: body.available_start_time_to,
        },
      }),
    ...(body.available_end_time_from !== undefined &&
      body.available_end_time_from !== null && {
        available_end_time: { gte: body.available_end_time_from },
      }),
    ...(body.available_end_time_to !== undefined &&
      body.available_end_time_to !== null && {
        available_end_time: {
          ...(body.available_end_time_from !== undefined &&
            body.available_end_time_from !== null && {
              gte: body.available_end_time_from,
            }),
          lte: body.available_end_time_to,
        },
      }),
    ...(body.recurrence_pattern !== undefined &&
      body.recurrence_pattern !== null && {
        recurrence_pattern: { contains: body.recurrence_pattern },
      }),
    ...(body.exception_dates !== undefined &&
      body.exception_dates !== null && {
        exception_dates: { contains: body.exception_dates },
      }),
  };

  // Data query and pagination
  const [schedules, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_resource_schedules.findMany({
      where,
      orderBy: { [sortField]: sortDir },
      skip,
      take: safeLimit,
    }),
    MyGlobal.prisma.healthcare_platform_resource_schedules.count({ where }),
  ]);

  // Transform Prisma schedule rows to API contract
  const data = schedules.map((row) => {
    return {
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
      ...(row.deleted_at !== undefined &&
        row.deleted_at !== null && {
          deleted_at: toISOStringSafe(row.deleted_at),
        }),
    };
  });

  // Structure pagination result
  return {
    pagination: {
      current: Number(safePage),
      limit: Number(safeLimit),
      records: total,
      pages: Math.ceil(total / safeLimit),
    },
    data,
  };
}
