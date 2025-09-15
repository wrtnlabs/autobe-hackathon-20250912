import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformOutcomeMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOutcomeMetric";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve a single outcome metric record and its metadata by metricId from
 * healthcare_platform_outcome_metrics.
 *
 * This operation fetches all analytic, cohort, audit, and reporting metadata
 * for a single outcome metric. The endpoint enforces strict organization-level
 * RBAC: only admins belonging to the metric's organization may access this
 * record. The response always includes all primary fields, calculation context,
 * timestamps, and cohort definition, enabling full audit and drilldown
 * capability for performance analytics and compliance workflows.
 *
 * @param props - Required parameters and authentication.
 * @param props.organizationAdmin - Authenticated admin payload for the user's
 *   organization.
 * @param props.metricId - Unique outcome metric record (UUID).
 * @returns Detailed outcome metric record and calculation metadata for in-depth
 *   analytics.
 * @throws {Error} If the metricId does not exist, is deleted, or is outside of
 *   the admin's permitted organization scope.
 */
export async function gethealthcarePlatformOrganizationAdminOutcomeMetricsMetricId(props: {
  organizationAdmin: OrganizationadminPayload;
  metricId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformOutcomeMetric> {
  const { organizationAdmin, metricId } = props;
  const record =
    await MyGlobal.prisma.healthcare_platform_outcome_metrics.findFirst({
      where: {
        id: metricId,
        organization_id: organizationAdmin.id,
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
  if (!record)
    throw new Error(
      "Outcome metric not found, deleted, or access is forbidden for this organization.",
    );
  return {
    id: record.id,
    organization_id: record.organization_id,
    department_id: record.department_id ?? undefined,
    metric_name: record.metric_name,
    description: record.description ?? undefined,
    cohort_definition_json: record.cohort_definition_json,
    observed_value: record.observed_value,
    observed_at: toISOStringSafe(record.observed_at),
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at
      ? toISOStringSafe(record.deleted_at)
      : undefined,
  };
}
