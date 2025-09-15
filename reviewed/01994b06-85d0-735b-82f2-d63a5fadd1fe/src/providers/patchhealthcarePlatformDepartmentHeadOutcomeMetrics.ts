import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformOutcomeMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOutcomeMetric";
import { IPageIHealthcarePlatformOutcomeMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformOutcomeMetric";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Search and retrieve a filtered, paginated list of outcome metrics for
 * analytics using healthcare_platform_outcome_metrics.
 *
 * This operation retrieves a paginated and filtered list of outcome metrics for
 * the department associated with the authenticated department head
 * (departmentHead role). It enforces RBAC such that only outcome metrics for
 * the department head's department and organization are returned, with
 * additional filtering on metric_name (partial match), observed_at time range,
 * observed_value range, and supports pagination and sort.
 *
 * @param props - The request props
 * @param props.departmentHead - The authenticated Department Head user payload
 * @param props.body - The filter and pagination parameters for the metric query
 * @returns A page of summary outcome metric records matching the search/filter
 *   criteria scoped to the department head's department and organization
 * @throws {Error} If access is unauthorized or mappings are missing
 */
export async function patchhealthcarePlatformDepartmentHeadOutcomeMetrics(props: {
  departmentHead: DepartmentheadPayload;
  body: IHealthcarePlatformOutcomeMetric.IRequest;
}): Promise<IPageIHealthcarePlatformOutcomeMetric.ISummary> {
  const { departmentHead, body } = props;

  // Lookup department for RBAC
  const department =
    await MyGlobal.prisma.healthcare_platform_departments.findFirst({
      where: {
        id: body.department_id,
        deleted_at: null,
      },
    });
  if (!department) {
    throw new Error(
      "Unauthorized: Department head does not manage this department or department does not exist.",
    );
  }

  // Build query filters (departmentHead can only see their assigned department)
  const whereQuery: Record<string, unknown> = {
    deleted_at: null,
    organization_id: department.healthcare_platform_organization_id,
    department_id: department.id,
    ...(body.metric_name
      ? { metric_name: { contains: body.metric_name } }
      : {}),
    ...(body.observed_at_start || body.observed_at_end
      ? {
          observed_at: {
            ...(body.observed_at_start ? { gte: body.observed_at_start } : {}),
            ...(body.observed_at_end ? { lte: body.observed_at_end } : {}),
          },
        }
      : {}),
    ...(body.value_min !== undefined || body.value_max !== undefined
      ? {
          observed_value: {
            ...(body.value_min !== undefined ? { gte: body.value_min } : {}),
            ...(body.value_max !== undefined ? { lte: body.value_max } : {}),
          },
        }
      : {}),
  };

  // Pagination
  const pageRaw = body.page !== undefined && body.page > 0 ? body.page : 1;
  const limitRaw = body.limit !== undefined && body.limit > 0 ? body.limit : 25;
  const skip = (pageRaw - 1) * limitRaw;

  // Sorting
  let orderByQuery: Record<string, "asc" | "desc"> = { observed_at: "desc" };
  if (body.sort) {
    const [field, dir] = body.sort.split(":");
    if (
      field &&
      ["observed_at", "metric_name", "observed_value"].includes(field)
    ) {
      orderByQuery = { [field]: dir === "asc" ? "asc" : "desc" };
    }
  }

  // Query data and count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_outcome_metrics.findMany({
      where: whereQuery,
      orderBy: orderByQuery,
      skip,
      take: limitRaw,
    }),
    MyGlobal.prisma.healthcare_platform_outcome_metrics.count({
      where: whereQuery,
    }),
  ]);

  // Map records to ISummary format, converting Date fields with toISOStringSafe()
  const data = rows.map((row) => ({
    id: row.id,
    organization_id: row.organization_id,
    department_id: row.department_id ?? undefined,
    metric_name: row.metric_name,
    observed_at: toISOStringSafe(row.observed_at),
    observed_value: row.observed_value,
    created_at: toISOStringSafe(row.created_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
  }));

  // Compose pagination data
  return {
    pagination: {
      current: Number(pageRaw),
      limit: Number(limitRaw),
      records: total,
      pages: Math.ceil(total / limitRaw),
    },
    data,
  };
}
