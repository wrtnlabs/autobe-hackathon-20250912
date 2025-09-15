import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBenchmarkDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBenchmarkDefinition";
import { IPageIHealthcarePlatformBenchmarkDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformBenchmarkDefinition";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * List and search available benchmark definitions for healthcare KPI/analytics
 * reporting.
 *
 * This operation retrieves a paginated and filtered list of benchmark
 * definitions for healthcare metrics/KPIs within the multi-tenant environment.
 * It queries the healthcare_platform_benchmark_definitions table and supports
 * filtering on organization boundary, benchmark code, label, value range,
 * units, and effective dates, with pagination and sorting. Only organization
 * admins with analytics permissions may access their organization's or global
 * (organization_id=null) benchmark definitions.
 *
 * @param props - Request properties
 * @param props.organizationAdmin - Authenticated organization admin user
 *   payload (OrganizationadminPayload)
 * @param props.body - Filter/search and pagination parameters
 *   (IHealthcarePlatformBenchmarkDefinition.IRequest)
 * @returns Paginated list of benchmark summaries matching search criteria
 * @throws {Error} When access is unauthorized or arguments are invalid
 */
export async function patchhealthcarePlatformOrganizationAdminBenchmarkDefinitions(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformBenchmarkDefinition.IRequest;
}): Promise<IPageIHealthcarePlatformBenchmarkDefinition.ISummary> {
  const { organizationAdmin, body } = props;

  // Authorization: must be organizationadmin
  if (organizationAdmin.type !== "organizationadmin") {
    throw new Error("Unauthorized: Not an organization admin.");
  }

  // Pagination
  let page = body.page ?? 1;
  let pageSize = body.page_size ?? 20;
  if (typeof page !== "number" || !Number.isInteger(page) || page < 1) {
    throw new Error("Invalid page number: must be positive integer");
  }
  if (
    typeof pageSize !== "number" ||
    !Number.isInteger(pageSize) ||
    pageSize < 1
  ) {
    throw new Error("Invalid page_size: must be positive integer");
  }

  // Only records for this admin's org or global/NULL org_id allowed
  const orgId = organizationAdmin.id;

  // Build where clause
  const where = {
    deleted_at: null,
    OR: [{ organization_id: orgId }, { organization_id: null }],
    ...(body.benchmark_code !== undefined &&
      body.benchmark_code !== null && {
        benchmark_code: body.benchmark_code,
      }),
    ...(body.label !== undefined &&
      body.label !== null && {
        label: {
          contains: body.label,
          // No mode: 'insensitive' for SQLite compatibility
        },
      }),
    ...(body.unit !== undefined &&
      body.unit !== null && {
        unit: body.unit,
      }),
    ...(body.value_min !== undefined &&
      body.value_min !== null && {
        value: { gte: body.value_min },
      }),
    ...(body.value_max !== undefined &&
      body.value_max !== null && {
        value: {
          ...(body.value_min !== undefined &&
            body.value_min !== null && { gte: body.value_min }),
          lte: body.value_max,
        },
      }),
    ...(body.effective_start_at_from !== undefined &&
      body.effective_start_at_from !== null && {
        effective_start_at: {
          gte: body.effective_start_at_from,
        },
      }),
    ...(body.effective_start_at_to !== undefined &&
      body.effective_start_at_to !== null && {
        effective_start_at: {
          ...(body.effective_start_at_from !== undefined &&
            body.effective_start_at_from !== null && {
              gte: body.effective_start_at_from,
            }),
          lte: body.effective_start_at_to,
        },
      }),
    ...(body.effective_end_at_from !== undefined &&
      body.effective_end_at_from !== null && {
        effective_end_at: {
          gte: body.effective_end_at_from,
        },
      }),
    ...(body.effective_end_at_to !== undefined &&
      body.effective_end_at_to !== null && {
        effective_end_at: {
          ...(body.effective_end_at_from !== undefined &&
            body.effective_end_at_from !== null && {
              gte: body.effective_end_at_from,
            }),
          lte: body.effective_end_at_to,
        },
      }),
  };

  // Sorting
  const allowedSortFields = [
    "benchmark_code",
    "label",
    "value",
    "created_at",
    "updated_at",
  ] as const;
  const rawSortField = body.sort_field;
  const sortField =
    rawSortField && allowedSortFields.includes(rawSortField as any)
      ? rawSortField
      : "created_at";
  const sortDirection = body.sort_direction === "asc" ? "asc" : "desc";

  // Get total records first
  const totalRecords =
    await MyGlobal.prisma.healthcare_platform_benchmark_definitions.count({
      where,
    });

  // Fetch paginated data
  const rows =
    await MyGlobal.prisma.healthcare_platform_benchmark_definitions.findMany({
      where,
      orderBy: { [sortField]: sortDirection },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

  // Format each record to ISummary (dates as string & tags.Format<'date-time'>, UUIDs as string & tags.Format<'uuid'>)
  const data = rows.map((row) => ({
    id: row.id,
    organization_id: row.organization_id ?? undefined,
    benchmark_code: row.benchmark_code,
    label: row.label,
    value: row.value,
    unit: row.unit,
    effective_start_at: toISOStringSafe(row.effective_start_at),
    effective_end_at: row.effective_end_at
      ? toISOStringSafe(row.effective_end_at)
      : undefined,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
  }));

  const result = {
    pagination: {
      current: Number(page),
      limit: Number(pageSize),
      records: totalRecords,
      pages: Math.ceil(totalRecords / pageSize),
    },
    data,
  };
  return result;
}
