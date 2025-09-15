import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformOutcomeMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOutcomeMetric";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve the full detail of a specific outcome metric using metricId.
 *
 * This function fetches a single outcome metric record (by metricId) from the
 * healthcare_platform_outcome_metrics table, including all required and
 * optional metadata for interactive analytics, auditing, and quality/compliance
 * workflows.
 *
 * Role-based authorization is enforced: systemAdmin can access any metric. If
 * the metric does not exist or is soft-deleted, an error is thrown. All
 * date/datetime values are converted to string & tags.Format<'date-time'>.
 * Access is logged separately for security and audit compliance.
 *
 * @param props - Request properties
 * @param props.systemAdmin - The authenticated system admin executing the
 *   request
 * @param props.metricId - The unique outcome metric ID to retrieve
 * @returns The detailed outcome metric record and all metadata fields
 * @throws {Error} When the metric does not exist, has been deleted, or access
 *   is unauthorized
 */
export async function gethealthcarePlatformSystemAdminOutcomeMetricsMetricId(props: {
  systemAdmin: SystemadminPayload;
  metricId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformOutcomeMetric> {
  const metric =
    await MyGlobal.prisma.healthcare_platform_outcome_metrics.findFirst({
      where: {
        id: props.metricId,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
        department_id: true,
        metric_name: true,
        description: true,
        cohort_definition_json: true,
        observed_value: true,
        observed_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!metric) {
    throw new Error("Outcome metric not found or access denied");
  }
  return {
    id: metric.id,
    organization_id: metric.organization_id,
    department_id: metric.department_id ?? undefined,
    metric_name: metric.metric_name,
    description: metric.description ?? undefined,
    cohort_definition_json: metric.cohort_definition_json,
    observed_value: metric.observed_value,
    observed_at: toISOStringSafe(metric.observed_at),
    created_at: toISOStringSafe(metric.created_at),
    updated_at: toISOStringSafe(metric.updated_at),
    deleted_at: metric.deleted_at
      ? toISOStringSafe(metric.deleted_at)
      : undefined,
  };
}
