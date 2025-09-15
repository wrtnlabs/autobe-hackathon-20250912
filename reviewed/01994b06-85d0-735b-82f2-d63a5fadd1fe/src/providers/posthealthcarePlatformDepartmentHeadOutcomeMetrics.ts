import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformOutcomeMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOutcomeMetric";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Create a new outcome metric timeseries record in
 * healthcare_platform_outcome_metrics for analytics.
 *
 * This endpoint allows department heads to submit new outcome metrics
 * representing key performance or quality measurements for their department or
 * organization. Validates uniqueness by (organization_id, department_id,
 * metric_name, observed_at); rejects duplicates. All date/datetime values are
 * handled as branded ISO 8601 strings.
 *
 * @param props - Properties for the creation operation
 * @param props.departmentHead - The authenticated Department Head user
 * @param props.body - IHealthcarePlatformOutcomeMetric.ICreate: payload for the
 *   new metric
 * @returns The created IHealthcarePlatformOutcomeMetric
 * @throws {Error} If a metric with the same organization, department,
 *   metric_name, and observed_at already exists
 */
export async function posthealthcarePlatformDepartmentHeadOutcomeMetrics(props: {
  departmentHead: DepartmentheadPayload;
  body: IHealthcarePlatformOutcomeMetric.ICreate;
}): Promise<IHealthcarePlatformOutcomeMetric> {
  const { departmentHead, body } = props;

  // Pre-insertion uniqueness check: organization_id, department_id, metric_name, observed_at
  const exists =
    await MyGlobal.prisma.healthcare_platform_outcome_metrics.findFirst({
      where: {
        organization_id: body.organization_id,
        metric_name: body.metric_name,
        observed_at: body.observed_at,
        department_id: body.department_id ?? null,
      },
    });
  if (exists !== null) {
    throw new Error(
      "An outcome metric with the same organization, department, metric_name, and observed_at already exists.",
    );
  }

  // Prepare all date-time strings (toISOStringSafe usage)
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.healthcare_platform_outcome_metrics.create({
      data: {
        id: v4(),
        organization_id: body.organization_id,
        department_id: body.department_id ?? null,
        metric_name: body.metric_name,
        description: body.description ?? null,
        cohort_definition_json: body.cohort_definition_json,
        observed_value: body.observed_value,
        observed_at: body.observed_at,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  return {
    id: created.id,
    organization_id: created.organization_id,
    department_id: created.department_id ?? undefined,
    metric_name: created.metric_name,
    description: created.description ?? undefined,
    cohort_definition_json: created.cohort_definition_json,
    observed_value: created.observed_value,
    observed_at: created.observed_at,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at ?? undefined,
  };
}
