import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsPerformanceMetric";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieves detailed information for a single performance metric record by its
 * unique ID.
 *
 * This operation supports monitoring and analysis of system resource
 * utilization and performance trends across tenants or globally.
 *
 * Only authorized systemAdmin users can access this operation.
 *
 * @param props - Object containing authentication and parameter fields
 * @param props.systemAdmin - Authenticated systemAdmin payload
 * @param props.id - Unique identifier of the performance metric record
 * @returns The detailed performance metric record matching the ID
 * @throws {Error} Throws if no performance metric with the given ID is found
 */
export async function getenterpriseLmsSystemAdminPerformanceMetricsId(props: {
  systemAdmin: SystemadminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsPerformanceMetric> {
  const { systemAdmin, id } = props;

  const metric =
    await MyGlobal.prisma.enterprise_lms_performance_metrics.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        tenant_id: true,
        metric_name: true,
        metric_value: true,
        recorded_at: true,
        created_at: true,
        updated_at: true,
      },
    });

  return {
    id: metric.id,
    tenant_id: metric.tenant_id === null ? undefined : metric.tenant_id,
    metric_name: metric.metric_name,
    metric_value: metric.metric_value,
    recorded_at: toISOStringSafe(metric.recorded_at),
    created_at: toISOStringSafe(metric.created_at),
    updated_at: toISOStringSafe(metric.updated_at),
  };
}
