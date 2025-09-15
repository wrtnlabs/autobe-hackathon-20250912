import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformKpiSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformKpiSnapshot";
import { IPageIHealthcarePlatformKpiSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformKpiSnapshot";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and paginate KPI snapshot entries (healthcare_platform_kpi_snapshots
 * table).
 *
 * Retrieves a filtered, paginated list of key performance indicator (KPI)
 * snapshots for analytics dashboards and reporting, restricted to the
 * organization of the authenticated organization admin. Allows flexible search,
 * filtering, sorting, and pagination across the
 * healthcare_platform_kpi_snapshots table for the admin's authorized
 * organization.
 *
 * @param props - Request properties
 * @param props.organizationAdmin - Authenticated organization admin making the
 *   request
 * @param props.body - Search, filter, sort, and pagination criteria for KPI
 *   snapshots
 * @returns Paginated results of KPI snapshots matching the search criteria,
 *   with strict date/datetime handling
 * @throws {Error} If invalid search criteria, sorting parameters, or
 *   unauthorized access is attempted
 */
export async function patchhealthcarePlatformOrganizationAdminKpiSnapshots(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformKpiSnapshot.IRequest;
}): Promise<IPageIHealthcarePlatformKpiSnapshot> {
  const { organizationAdmin, body } = props;

  // Enforce access to only the admin's organization
  const organization_id = organizationAdmin.id;
  if (!organization_id)
    throw new Error("Unauthorized: organizationAdmin user missing id");

  // Whitelist of allowed sort fields based on model & DTO
  const allowedSortFields: readonly string[] = [
    "recorded_at",
    "created_at",
    "updated_at",
    "value",
    "kpi_name",
    "label",
  ];
  let sort_by = body.sort_by ?? "recorded_at";
  if (!allowedSortFields.includes(sort_by)) {
    throw new Error(
      `Invalid sort_by: Allowed fields are ${allowedSortFields.join(", ")}`,
    );
  }
  let sort_direction = body.sort_direction === "asc" ? "asc" : "desc";

  // Pagination defaults
  const page = typeof body.page === "number" && body.page > 0 ? body.page : 1;
  const limit =
    typeof body.limit === "number" && body.limit > 0 ? body.limit : 20;
  const skip = (page - 1) * limit;

  // Build WHERE clause for Prisma, only allowed filters & handling null/undefined
  const where = {
    organization_id,
    ...(body.department_id !== undefined &&
      body.department_id !== null && {
        department_id: body.department_id,
      }),
    ...(body.benchmark_id !== undefined &&
      body.benchmark_id !== null && {
        benchmark_id: body.benchmark_id,
      }),
    ...(body.kpi_name !== undefined &&
      body.kpi_name !== null && {
        kpi_name: body.kpi_name,
      }),
    ...(body.label !== undefined &&
      body.label !== null && {
        label: { contains: body.label },
      }),
    // Date range filter
    ...((body.recorded_at_from !== undefined &&
      body.recorded_at_from !== null) ||
    (body.recorded_at_to !== undefined && body.recorded_at_to !== null)
      ? {
          recorded_at: {
            ...(body.recorded_at_from !== undefined &&
              body.recorded_at_from !== null && {
                gte: body.recorded_at_from,
              }),
            ...(body.recorded_at_to !== undefined &&
              body.recorded_at_to !== null && {
                lte: body.recorded_at_to,
              }),
          },
        }
      : {}),
    // Numeric value filters
    ...((body.min_value !== undefined && body.min_value !== null) ||
    (body.max_value !== undefined && body.max_value !== null)
      ? {
          value: {
            ...(body.min_value !== undefined &&
              body.min_value !== null && { gte: body.min_value }),
            ...(body.max_value !== undefined &&
              body.max_value !== null && { lte: body.max_value }),
          },
        }
      : {}),
  };

  // Execute paginated query and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_kpi_snapshots.findMany({
      where,
      orderBy: { [sort_by]: sort_direction },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.healthcare_platform_kpi_snapshots.count({ where }),
  ]);

  // Map results to DTO, strict null/undefined handling & toISOStringSafe for dates
  const data = rows.map((row) => {
    return {
      id: row.id,
      organization_id: row.organization_id,
      department_id: row.department_id ?? undefined,
      benchmark_id: row.benchmark_id ?? undefined,
      kpi_name: row.kpi_name,
      label: row.label,
      description: row.description ?? undefined,
      calculation_config_json: row.calculation_config_json,
      value: row.value,
      recorded_at: toISOStringSafe(row.recorded_at),
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
    };
  });

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
