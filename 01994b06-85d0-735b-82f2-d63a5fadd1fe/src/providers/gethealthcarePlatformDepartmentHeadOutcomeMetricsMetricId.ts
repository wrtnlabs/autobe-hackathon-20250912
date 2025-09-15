import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformOutcomeMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOutcomeMetric";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Retrieve a single outcome metric record and its metadata by metricId from
 * healthcare_platform_outcome_metrics.
 *
 * This endpoint allows a department head user to retrieve the full analytics
 * detail for a specific outcome metric by its UUID. Only department heads whose
 * ID matches the department_id on the metric record are authorized. If the
 * metric does not exist, is deleted, or does not match the user's department,
 * an error is thrown. All date/datetime fields are returned as ISO 8601 branded
 * strings per strict API contract.
 *
 * @param props - Request parameter object
 * @param props.departmentHead - The authenticated department head
 *   (DepartmentheadPayload)
 * @param props.metricId - UUID of the outcome metric to retrieve
 * @returns IHealthcarePlatformOutcomeMetric with all fields
 * @throws {Error} If the metric does not exist, is soft-deleted, or is
 *   unauthorized for this user
 */
export async function gethealthcarePlatformDepartmentHeadOutcomeMetricsMetricId(props: {
  departmentHead: DepartmentheadPayload;
  metricId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformOutcomeMetric> {
  const { departmentHead, metricId } = props;
  // Fetch the outcome metric (not soft-deleted)
  const metric =
    await MyGlobal.prisma.healthcare_platform_outcome_metrics.findFirst({
      where: {
        id: metricId,
        deleted_at: null,
      },
    });
  if (!metric) {
    throw new Error("Outcome metric not found");
  }
  // Enforce department head RBAC: departmentHead.id === metric.department_id
  if (!metric.department_id || metric.department_id !== departmentHead.id) {
    throw new Error("Forbidden: You are not authorized to access this metric");
  }
  // Convert all Date fields to ISO strings, handle nullables for optional DTO fields
  const dto: IHealthcarePlatformOutcomeMetric = {
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
  return dto;
}
