import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformOutcomeMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOutcomeMetric";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new outcome metric timeseries record in
 * healthcare_platform_outcome_metrics for analytics.
 *
 * This function enables an organization admin to create a new quantitative
 * outcome metric (e.g., readmission rate, infection rate) for a specific
 * organization or department. The created record is validated for uniqueness on
 * (organization_id, department_id, metric_name, observed_at) and permission
 * scope. All metadata and metrics required for subsequent analytics are stored
 * and returned for immediate dashboard/reporting use.
 *
 * @param props - Parameters for outcome metric creation
 * @param props.organizationAdmin - Authenticated organization admin user (JWT
 *   principal)
 * @param props.body - Creation payload containing metric name, cohort, observed
 *   value/timestamp, description, and optional department association
 * @returns The newly created outcome metric record, complete with metadata,
 *   timestamps, and context
 * @throws {Error} If attempting to create a duplicate metric record (same org,
 *   dep, name, observedAt)
 * @throws {Error} If the authenticated user is not authorized for the given
 *   organization_id
 */
export async function posthealthcarePlatformOrganizationAdminOutcomeMetrics(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformOutcomeMetric.ICreate;
}): Promise<IHealthcarePlatformOutcomeMetric> {
  const { organizationAdmin, body } = props;
  // Authorization: orgadmin.id must match organization_id
  if (organizationAdmin.id !== body.organization_id) {
    throw new Error(
      "You are not authorized to create outcome metrics for this organization.",
    );
  }

  // Uniqueness: ensure (organization_id, department_id, metric_name, observed_at) is unique
  const exists =
    await MyGlobal.prisma.healthcare_platform_outcome_metrics.findFirst({
      where: {
        organization_id: body.organization_id,
        department_id: body.department_id ?? null,
        metric_name: body.metric_name,
        observed_at: body.observed_at,
      },
    });
  if (exists) {
    throw new Error(
      "Duplicate metric: The combination of metric_name and observed_at must be unique per organization/department.",
    );
  }

  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());
  // All date/datetime: never use as, always use toISOStringSafe or direct assignment where branding already matches type
  const created =
    await MyGlobal.prisma.healthcare_platform_outcome_metrics.create({
      data: {
        id,
        organization_id: body.organization_id,
        department_id: body.department_id ?? null,
        metric_name: body.metric_name,
        description: body.description ?? null,
        cohort_definition_json: body.cohort_definition_json,
        observed_value: body.observed_value,
        observed_at: body.observed_at,
        created_at: now,
        updated_at: now,
      },
    });
  const output: IHealthcarePlatformOutcomeMetric = {
    id: created.id,
    organization_id: created.organization_id,
    department_id: created.department_id ?? undefined,
    metric_name: created.metric_name,
    description: created.description ?? undefined,
    cohort_definition_json: created.cohort_definition_json,
    observed_value: created.observed_value,
    observed_at: toISOStringSafe(created.observed_at),
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
  return output;
}
