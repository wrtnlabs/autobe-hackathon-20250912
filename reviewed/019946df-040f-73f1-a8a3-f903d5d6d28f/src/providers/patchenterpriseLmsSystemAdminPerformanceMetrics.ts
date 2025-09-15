import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsPerformanceMetric";
import { IPageIEnterpriseLmsPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsPerformanceMetric";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and retrieve paginated performance metrics.
 *
 * Retrieves performance metrics with optional filtering by tenant, metric name,
 * and timestamps. Supports pagination with page and limit parameters. Requires
 * systemAdmin authorization.
 *
 * @param props - Object containing authenticated systemAdmin and query filters
 * @returns Paginated list of performance metric records
 * @throws {Error} Unauthorized or database errors
 */
export async function patchenterpriseLmsSystemAdminPerformanceMetrics(props: {
  systemAdmin: SystemadminPayload;
  body: IEnterpriseLmsPerformanceMetric.IRequest;
}): Promise<IPageIEnterpriseLmsPerformanceMetric> {
  const { systemAdmin, body } = props;

  // Pagination parameters with defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Build where conditions based on filters
  const where = {
    ...(body.tenant_id !== undefined &&
      body.tenant_id !== null && { tenant_id: body.tenant_id }),
    ...(body.metric_name !== undefined &&
      body.metric_name !== null && {
        metric_name: { contains: body.metric_name },
      }),
    ...(body.recorded_at !== undefined &&
      body.recorded_at !== null && { recorded_at: body.recorded_at }),
    ...(body.created_at !== undefined &&
      body.created_at !== null && { created_at: body.created_at }),
    ...(body.updated_at !== undefined &&
      body.updated_at !== null && { updated_at: body.updated_at }),
  };

  // Execute parallel query to fetch data and total count
  const [results, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_performance_metrics.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.enterprise_lms_performance_metrics.count({ where }),
  ]);

  // Return paginated data with ISO string dates
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id,
      tenant_id: item.tenant_id ?? null,
      metric_name: item.metric_name,
      metric_value: item.metric_value,
      recorded_at: toISOStringSafe(item.recorded_at),
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
  };
}
