import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformOutcomeMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOutcomeMetric";
import { IPageIHealthcarePlatformOutcomeMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformOutcomeMetric";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and retrieve a filtered, paginated list of outcome metrics for
 * analytics using healthcare_platform_outcome_metrics.
 *
 * Retrieves outcome metric summary records matching filter and pagination
 * parameters, scoped to the authenticated organization admin. Supports
 * filtering by organization, department, metric name (partial match),
 * observed_at date range, value range, and flexible paging/sorting. Enforces
 * RBAC so only the organization admin's organization's metrics are visible.
 * Results are mapped for dashboard/analytics consumption, with all
 * date/datetime fields represented as ISO8601 strings, and all IDs as UUIDs.
 *
 * @param props - Wrapper parameter object
 * @param props.organizationAdmin - Authenticated organization admin user (RBAC
 *   context)
 * @param props.body - Filter/search and pagination input
 * @returns Paginated summary list of outcome metric records matching filter
 *   criteria
 * @throws {Error} If invalid sort field specified, or permission is violated by
 *   context
 */
export async function patchhealthcarePlatformOrganizationAdminOutcomeMetrics(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformOutcomeMetric.IRequest;
}): Promise<IPageIHealthcarePlatformOutcomeMetric.ISummary> {
  const { organizationAdmin, body } = props;

  // RBAC: enforce organization context
  const where = {
    organization_id: organizationAdmin.id,
    ...(body.department_id !== undefined
      ? { department_id: body.department_id }
      : {}),
    ...(body.metric_name !== undefined
      ? { metric_name: { contains: body.metric_name } }
      : {}),
    ...(body.observed_at_start !== undefined && body.observed_at_start !== null
      ? { observed_at: { gte: body.observed_at_start } }
      : {}),
    ...(body.observed_at_end !== undefined && body.observed_at_end !== null
      ? { observed_at: { lte: body.observed_at_end } }
      : {}),
    ...(body.value_min !== undefined
      ? { observed_value: { gte: body.value_min } }
      : {}),
    ...(body.value_max !== undefined
      ? { observed_value: { lte: body.value_max } }
      : {}),
    deleted_at: null,
  };

  const limit = body.limit ?? 25;
  const page = body.page ?? 1;
  const skip = (Number(page) - 1) * Number(limit);
  // Only allow whitelisted sort field/direction
  let orderBy;
  if (body.sort) {
    const [field, rawDirection] = body.sort.split(":"),
      direction = rawDirection === "asc" ? "asc" : "desc";
    if (["observed_at", "metric_name", "observed_value"].includes(field)) {
      orderBy = { [field]: direction };
    }
  }
  if (!orderBy) {
    orderBy = { observed_at: "desc" };
  }

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_outcome_metrics.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy,
    }),
    MyGlobal.prisma.healthcare_platform_outcome_metrics.count({ where }),
  ]);
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(limit)),
    },
    data: rows.map((row) => ({
      id: row.id,
      organization_id: row.organization_id,
      department_id: row.department_id === null ? undefined : row.department_id,
      metric_name: row.metric_name,
      observed_at: toISOStringSafe(row.observed_at),
      observed_value: row.observed_value,
      created_at: toISOStringSafe(row.created_at),
      deleted_at:
        row.deleted_at === null ? undefined : toISOStringSafe(row.deleted_at),
    })),
  };
}
