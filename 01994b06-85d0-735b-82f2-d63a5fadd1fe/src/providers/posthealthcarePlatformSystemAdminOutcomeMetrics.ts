import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformOutcomeMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOutcomeMetric";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new outcome metric timeseries record in
 * healthcare_platform_outcome_metrics for analytics.
 *
 * This operation creates a new outcome metric timeseries record, representing a
 * key performance indicator or quality metric for cross-organizational and
 * departmental analytics. System administrators are authorized to submit new
 * metrics if metric_name and observed_at are unique within an organization. The
 * function enforces uniqueness, validates permissions, saves metadata, and
 * returns the detailed outcome metric.
 *
 * @param props - Request properties
 * @param props.systemAdmin - Authenticated Systemadmin making the request
 * @param props.body - Data for creating the outcome metric (name, cohort
 *   definition, value, timestamps, etc)
 * @returns The newly created outcome metric record, with all metadata and audit
 *   fields populated
 * @throws {Error} If the system admin role is invalid or if a duplicate record
 *   exists
 */
export async function posthealthcarePlatformSystemAdminOutcomeMetrics(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformOutcomeMetric.ICreate;
}): Promise<IHealthcarePlatformOutcomeMetric> {
  const { systemAdmin, body } = props;
  if (systemAdmin.type !== "systemAdmin") {
    throw new Error("Unauthorized: Must be a system admin");
  }
  // Check for uniqueness: organization_id + metric_name + observed_at
  const exists =
    await MyGlobal.prisma.healthcare_platform_outcome_metrics.findFirst({
      where: {
        organization_id: body.organization_id,
        metric_name: body.metric_name,
        observed_at: body.observed_at,
      },
    });
  if (exists) {
    throw new Error(
      "Duplicate entry: Outcome metric already exists for this organization, metric_name, and observed_at",
    );
  }
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.healthcare_platform_outcome_metrics.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
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
    department_id: created.department_id ?? null,
    metric_name: created.metric_name,
    description: created.description ?? null,
    cohort_definition_json: created.cohort_definition_json,
    observed_value: created.observed_value,
    observed_at: toISOStringSafe(created.observed_at),
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at),
  };
}
