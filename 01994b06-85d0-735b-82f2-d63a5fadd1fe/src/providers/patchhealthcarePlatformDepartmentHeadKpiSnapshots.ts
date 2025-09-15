import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformKpiSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformKpiSnapshot";
import { IPageIHealthcarePlatformKpiSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformKpiSnapshot";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Search and paginate KPI snapshot entries (healthcare_platform_kpi_snapshots
 * table).
 *
 * This endpoint retrieves a filtered, paginated list of key performance
 * indicator (KPI) snapshots for analytics dashboards and reporting. It
 * restricts data to the authenticated department head's own department and
 * organization, and enforces full field, pagination, and access control logic.
 * Flexible search, filtering, sorting, and pagination are supported, with
 * business-aligned boundary checks for analytics consumers.
 *
 * @param props - The request object
 * @param props.departmentHead - The authenticated DepartmentheadPayload
 * @param props.body - Filter/search, paging, and sorting data for KPI snapshot
 *   search (IHealthcarePlatformKpiSnapshot.IRequest)
 * @returns A paginated result page of KPIs matching the requested filters and
 *   authorization boundaries (IPageIHealthcarePlatformKpiSnapshot)
 * @throws {Error} If attempting to query KPIs outside the authenticated
 *   department or organization, or if user is not authorized
 */
export async function patchhealthcarePlatformDepartmentHeadKpiSnapshots(props: {
  departmentHead: DepartmentheadPayload;
  body: IHealthcarePlatformKpiSnapshot.IRequest;
}): Promise<IPageIHealthcarePlatformKpiSnapshot> {
  const { departmentHead, body } = props;
  // Step 1: Get department and org for current departmentHead user
  const department =
    await MyGlobal.prisma.healthcare_platform_departmentheads.findFirst({
      where: { id: departmentHead.id, deleted_at: null },
      select: { id: true },
    });
  if (!department) throw new Error("Unauthorized or department head not found");
  const orgDepartment =
    await MyGlobal.prisma.healthcare_platform_departments.findFirst({
      where: { id: department.id, deleted_at: null },
      select: { id: true, healthcare_platform_organization_id: true },
    });
  if (!orgDepartment) throw new Error("Department not found");
  const department_id = orgDepartment.id;
  const organization_id = orgDepartment.healthcare_platform_organization_id;

  // Step 2: Access restriction: Only allow request for own department/org
  if (
    (body.department_id !== undefined &&
      body.department_id !== null &&
      body.department_id !== department_id) ||
    (body.organization_id !== undefined &&
      body.organization_id !== null &&
      body.organization_id !== organization_id)
  ) {
    throw new Error(
      "Access violation: cannot query outside own department/organization",
    );
  }

  // Step 3: Pagination and sort
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sort_by =
    body.sort_by &&
    [
      "recorded_at",
      "value",
      "created_at",
      "updated_at",
      "label",
      "kpi_name",
      "id",
    ].includes(body.sort_by)
      ? body.sort_by
      : "recorded_at";
  const sort_direction = body.sort_direction === "asc" ? "asc" : "desc";

  // Step 4: Build WHERE clause
  const filters: Record<string, any> = {
    deleted_at: null,
    organization_id,
    department_id,
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
    ...(((body.recorded_at_from !== undefined &&
      body.recorded_at_from !== null) ||
      (body.recorded_at_to !== undefined && body.recorded_at_to !== null)) && {
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
    }),
    ...(((body.min_value !== undefined && body.min_value !== null) ||
      (body.max_value !== undefined && body.max_value !== null)) && {
      value: {
        ...(body.min_value !== undefined &&
          body.min_value !== null && {
            gte: body.min_value,
          }),
        ...(body.max_value !== undefined &&
          body.max_value !== null && {
            lte: body.max_value,
          }),
      },
    }),
  };

  // Step 5: DB fetch
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_kpi_snapshots.findMany({
      where: filters,
      orderBy: { [sort_by]: sort_direction },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.healthcare_platform_kpi_snapshots.count({ where: filters }),
  ]);

  // Step 6: DTO mapping
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
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
