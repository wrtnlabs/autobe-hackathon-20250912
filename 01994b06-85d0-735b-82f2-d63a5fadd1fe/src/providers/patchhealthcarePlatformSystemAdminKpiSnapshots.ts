import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformKpiSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformKpiSnapshot";
import { IPageIHealthcarePlatformKpiSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformKpiSnapshot";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and paginate KPI snapshot entries (healthcare_platform_kpi_snapshots
 * table).
 *
 * Retrieves a paginated, filterable list of KPI snapshot data points for
 * analytics dashboards/reporting. Allows searching by organization, department,
 * benchmark, KPI name, date, value ranges, label, with flexible sorting/paging.
 * Only non-deleted entries (deleted_at == null) are returned. Strictly follows
 * DTO and schema constraints: all date/datetime values are strings; UUIDs are
 * properly branded.
 *
 * @param props - Function arguments and authentication context
 * @param props.systemAdmin - The authenticated system admin
 *   (SystemadminPayload)
 * @param props.body - The search, filter, sorting, and paging request body
 *   (IHealthcarePlatformKpiSnapshot.IRequest)
 * @returns Paginated result (IPageIHealthcarePlatformKpiSnapshot) of KPI
 *   snapshot entries
 * @throws {Error} If invalid pagination, sorting, or filter parameters are
 *   supplied
 */
export async function patchhealthcarePlatformSystemAdminKpiSnapshots(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformKpiSnapshot.IRequest;
}): Promise<IPageIHealthcarePlatformKpiSnapshot> {
  const { body } = props;

  // Allowed fields
  const allowedSortFields = [
    "recorded_at",
    "value",
    "created_at",
    "updated_at",
    "kpi_name",
    "label",
  ];

  // Validate page/limit
  const page = body.page && body.page > 0 ? body.page : 1;
  const limit = body.limit && body.limit > 0 ? body.limit : 20;
  const skip = (page - 1) * limit;

  // Validate sort_by/sort_direction
  const sortField =
    body.sort_by && allowedSortFields.includes(body.sort_by)
      ? body.sort_by
      : "recorded_at";
  const sortOrder = body.sort_direction === "asc" ? "asc" : "desc";

  // Build WHERE conditions
  const andConditions: Record<string, any>[] = [{ deleted_at: null }];

  if (body.organization_id !== undefined && body.organization_id !== null) {
    andConditions.push({ organization_id: body.organization_id });
  }
  if (body.department_id !== undefined && body.department_id !== null) {
    andConditions.push({ department_id: body.department_id });
  }
  if (body.benchmark_id !== undefined && body.benchmark_id !== null) {
    andConditions.push({ benchmark_id: body.benchmark_id });
  }
  if (body.kpi_name !== undefined && body.kpi_name !== null) {
    andConditions.push({ kpi_name: body.kpi_name });
  }
  if (body.label !== undefined && body.label !== null) {
    andConditions.push({ label: { contains: body.label } });
  }

  // Values for date and number ranges
  const recordedAt: Record<string, string & tags.Format<"date-time">> = {};
  if (body.recorded_at_from !== undefined && body.recorded_at_from !== null) {
    recordedAt.gte = body.recorded_at_from;
  }
  if (body.recorded_at_to !== undefined && body.recorded_at_to !== null) {
    recordedAt.lte = body.recorded_at_to;
  }
  if (Object.keys(recordedAt).length > 0) {
    andConditions.push({ recorded_at: recordedAt });
  }

  const valueCond: Record<string, number> = {};
  if (body.min_value !== undefined && body.min_value !== null) {
    valueCond.gte = body.min_value;
  }
  if (body.max_value !== undefined && body.max_value !== null) {
    valueCond.lte = body.max_value;
  }
  if (Object.keys(valueCond).length > 0) {
    andConditions.push({ value: valueCond });
  }

  // Compose the final WHERE object
  const where =
    andConditions.length === 1 ? andConditions[0] : { AND: andConditions };

  // Query paged results and total count concurrently
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_kpi_snapshots.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.healthcare_platform_kpi_snapshots.count({ where }),
  ]);

  // Map database results to DTO, convert all dates with toISOStringSafe()
  const data = rows.map((row) => ({
    id: row.id,
    organization_id: row.organization_id,
    department_id: row.department_id === null ? undefined : row.department_id,
    benchmark_id: row.benchmark_id === null ? undefined : row.benchmark_id,
    kpi_name: row.kpi_name,
    label: row.label,
    description: row.description === null ? undefined : row.description,
    calculation_config_json: row.calculation_config_json,
    value: row.value,
    recorded_at: toISOStringSafe(row.recorded_at),
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at:
      row.deleted_at === null || row.deleted_at === undefined
        ? undefined
        : toISOStringSafe(row.deleted_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Number(Math.ceil(total / limit)),
    },
    data,
  };
}
