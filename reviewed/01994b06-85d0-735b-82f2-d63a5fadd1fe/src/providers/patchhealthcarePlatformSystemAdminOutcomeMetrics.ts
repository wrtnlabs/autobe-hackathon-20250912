import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformOutcomeMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOutcomeMetric";
import { IPageIHealthcarePlatformOutcomeMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformOutcomeMetric";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and retrieve a filtered, paginated list of outcome metrics for
 * analytics using healthcare_platform_outcome_metrics.
 *
 * This function retrieves a paginated, filtered list of outcome metric records
 * from the healthcare_platform_outcome_metrics table, supporting advanced query
 * parameters for analytics dashboards and performance reviews. All inputs are
 * assumed to be validated and authorized for a system admin role.
 *
 * RBAC: Systemadmin has full access; future role expansion may restrict using
 * organization_id/department_id filtering. Sorting is supported on metric_name,
 * observed_at, observed_value in asc/desc order. Pagination is 1-indexed and
 * enforces reasonable defaults. All date/datetime values are ISO strings with
 * typia branding.
 *
 * @param props - Request properties
 * @param props.systemAdmin - The authenticated Systemadmin making the request
 * @param props.body - Request body containing search, filter, pagination, and
 *   sort instructions
 * @returns Paginated set of outcome metric records matching the requested
 *   criteria
 * @throws {Error} If invalid filter combinations are provided
 */
export async function patchhealthcarePlatformSystemAdminOutcomeMetrics(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformOutcomeMetric.IRequest;
}): Promise<IPageIHealthcarePlatformOutcomeMetric.ISummary> {
  const { body } = props;

  // Pagination handling with safe defaults and branding removed for calculations
  const page = body.page && body.page > 0 ? Number(body.page) : 1;
  const limit = body.limit && body.limit > 0 ? Number(body.limit) : 25;
  const skip = (page - 1) * limit;

  // Sorting logic
  let orderBy: Record<string, "asc" | "desc">;
  if (body.sort) {
    const [sortFieldRaw, sortDirRaw] = body.sort.split(":");
    const sortField = ["metric_name", "observed_at", "observed_value"].includes(
      sortFieldRaw,
    )
      ? sortFieldRaw
      : "observed_at";
    const sortDir =
      sortDirRaw && sortDirRaw.toLowerCase() === "asc" ? "asc" : "desc";
    orderBy = { [sortField]: sortDir };
  } else {
    orderBy = { observed_at: "desc" };
  }

  // WHERE filter construction
  const where = {
    deleted_at: null,
    // organization_id (optional filter)
    ...(body.organization_id !== undefined &&
      body.organization_id !== null && {
        organization_id: body.organization_id,
      }),
    // department_id (optional filter)
    ...(body.department_id !== undefined &&
      body.department_id !== null && {
        department_id: body.department_id,
      }),
    // metric_name: partial match (optional)
    ...(body.metric_name && {
      metric_name: {
        contains: body.metric_name,
      },
    }),
    // observed_at (date range filtering)
    ...(body.observed_at_start || body.observed_at_end
      ? {
          observed_at: {
            ...(body.observed_at_start && { gte: body.observed_at_start }),
            ...(body.observed_at_end && { lte: body.observed_at_end }),
          },
        }
      : {}),
    // observed_value (numeric range filtering)
    ...(body.value_min !== undefined || body.value_max !== undefined
      ? {
          observed_value: {
            ...(body.value_min !== undefined && { gte: body.value_min }),
            ...(body.value_max !== undefined && { lte: body.value_max }),
          },
        }
      : {}),
  };

  // Fetch paginated data and total count concurrently
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_outcome_metrics.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        organization_id: true,
        department_id: true,
        metric_name: true,
        observed_at: true,
        observed_value: true,
        created_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.healthcare_platform_outcome_metrics.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => {
      // Only brand if value is not null. Brand must be omitted for null department_id/deleted_at
      const summary: IHealthcarePlatformOutcomeMetric.ISummary = {
        id: row.id,
        organization_id: row.organization_id,
        metric_name: row.metric_name,
        observed_at: toISOStringSafe(row.observed_at),
        observed_value: row.observed_value,
        created_at: toISOStringSafe(row.created_at),
      };
      if (row.department_id !== undefined && row.department_id !== null) {
        summary.department_id = row.department_id;
      }
      if (row.deleted_at !== undefined && row.deleted_at !== null) {
        summary.deleted_at = toISOStringSafe(row.deleted_at);
      } else if ("deleted_at" in summary) {
        // Silently omit deleted_at if null
      }
      return summary;
    }),
  };
}
