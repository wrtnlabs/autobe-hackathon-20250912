import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBenchmarkDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBenchmarkDefinition";
import { IPageIHealthcarePlatformBenchmarkDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformBenchmarkDefinition";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * List and search available benchmark definitions for healthcare KPI/analytics
 * reporting.
 *
 * Retrieves a paginated and filtered set of benchmark definition summaries for
 * clinical/operational analytics from the
 * healthcare_platform_benchmark_definitions table. Supports filtering by
 * organization, code, label, value ranges, units, effective dates, and supports
 * dynamic pagination and sorting. Results are constrained to system admin
 * analytics/reporting permissions and exclude soft-deleted entries.
 *
 * @param props - Object containing all necessary parameters for the operation
 * @param props.systemAdmin - The authenticated system admin user making the
 *   request
 * @param props.body - The search/filter and pagination criteria for benchmark
 *   definitions
 * @returns Paginated summaries of benchmark definitions matching the search
 *   criteria
 * @throws {Error} If pagination parameters are invalid
 */
export async function patchhealthcarePlatformSystemAdminBenchmarkDefinitions(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformBenchmarkDefinition.IRequest;
}): Promise<IPageIHealthcarePlatformBenchmarkDefinition.ISummary> {
  const { body } = props;

  // Validate and normalize pagination
  const page = body.page ?? 1;
  const pageSize = body.page_size ?? 20;
  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 1000
  ) {
    throw new Error(
      "Invalid pagination parameters: page must be >= 1 and page_size 1~1000",
    );
  }

  // Supported sort fields
  const allowedSortFields = [
    "benchmark_code",
    "label",
    "value",
    "unit",
    "effective_start_at",
    "effective_end_at",
    "created_at",
    "updated_at",
  ];
  const rawSortField = body.sort_field ?? "";
  const sortField = allowedSortFields.includes(rawSortField)
    ? rawSortField
    : "created_at";
  const sortDirection = body.sort_direction === "asc" ? "asc" : "desc";

  // Build where clause for all possible filters
  const where: Record<string, any> = { deleted_at: null };
  if (body.organization_id !== undefined)
    where.organization_id = body.organization_id;
  if (body.benchmark_code !== undefined)
    where.benchmark_code = body.benchmark_code;
  if (body.label !== undefined) where.label = { contains: body.label };
  if (body.unit !== undefined) where.unit = body.unit;
  // Value range filter
  if (body.value_min !== undefined || body.value_max !== undefined) {
    where.value = {};
    if (body.value_min !== undefined) where.value.gte = body.value_min;
    if (body.value_max !== undefined) where.value.lte = body.value_max;
  }
  // effective_start_at filter (gte/lte)
  if (
    body.effective_start_at_from !== undefined ||
    body.effective_start_at_to !== undefined
  ) {
    where.effective_start_at = {};
    if (body.effective_start_at_from !== undefined)
      where.effective_start_at.gte = body.effective_start_at_from;
    if (body.effective_start_at_to !== undefined)
      where.effective_start_at.lte = body.effective_start_at_to;
  }
  // effective_end_at filter (gte/lte)
  if (
    body.effective_end_at_from !== undefined ||
    body.effective_end_at_to !== undefined
  ) {
    where.effective_end_at = {};
    if (body.effective_end_at_from !== undefined)
      where.effective_end_at.gte = body.effective_end_at_from;
    if (body.effective_end_at_to !== undefined)
      where.effective_end_at.lte = body.effective_end_at_to;
  }

  // Query and count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_benchmark_definitions.findMany({
      where,
      orderBy: { [sortField]: sortDirection },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    MyGlobal.prisma.healthcare_platform_benchmark_definitions.count({ where }),
  ]);

  // Map result: all dates → string & tags.Format<'date-time'>, handle nullable fields
  const data = rows.map((row) => {
    return {
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
    };
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(pageSize),
      records: Number(total),
      pages: Math.ceil(total / pageSize),
    },
    data,
  };
}
