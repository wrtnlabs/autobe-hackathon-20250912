import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformOutcomeMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOutcomeMetric";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update a specific healthcare outcome metric record
 * (IHealthcarePlatformOutcomeMetric).
 *
 * This endpoint allows authorized organization admin users to update any
 * editable fields of an existing outcome metric record, including metric name,
 * description, observed value and timestamp, cohort definition,
 * departmental/organizational assignment, and more. Strict RBAC ensures that
 * only users with actual admin assignment to the organization housing the
 * target metric can make changes. All updates are atomic, all dates are
 * format-corrected, and strict field matching ensures regulatory and audit
 * integrity.
 *
 * @param props - Parameters for the update operation
 * @param props.organizationAdmin - Authenticated organization admin payload
 * @param props.metricId - UUID of the outcome metric record to update
 * @param props.body - Partial object of updatable fields according to
 *   IHealthcarePlatformOutcomeMetric.IUpdate
 * @returns The fully updated outcome metric record as
 *   IHealthcarePlatformOutcomeMetric
 * @throws {Error} When the metric does not exist, has been deleted, or the
 *   admin is not assigned to the target organization
 */
export async function puthealthcarePlatformOrganizationAdminOutcomeMetricsMetricId(props: {
  organizationAdmin: OrganizationadminPayload;
  metricId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformOutcomeMetric.IUpdate;
}): Promise<IHealthcarePlatformOutcomeMetric> {
  const { organizationAdmin, metricId, body } = props;

  // Step 1: Fetch the outcome metric, ensure not deleted
  const metric =
    await MyGlobal.prisma.healthcare_platform_outcome_metrics.findFirst({
      where: {
        id: metricId,
        deleted_at: null,
      },
    });
  if (!metric) {
    throw new Error("Outcome metric not found or has been deleted.");
  }

  // Step 2: Validate organization admin assignment to the organization
  const orgAssignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: organizationAdmin.id,
        healthcare_platform_organization_id: metric.organization_id,
        deleted_at: null,
      },
    });
  if (!orgAssignment) {
    throw new Error(
      "Not authorized to update metric: Not an admin for the target organization.",
    );
  }

  // Step 3: Build update data object inline (only supplied fields)
  const updateData = {
    ...(body.metric_name !== undefined && { metric_name: body.metric_name }),
    ...(body.description !== undefined && { description: body.description }),
    ...(body.cohort_definition_json !== undefined && {
      cohort_definition_json: body.cohort_definition_json,
    }),
    ...(body.observed_value !== undefined && {
      observed_value: body.observed_value,
    }),
    ...(body.observed_at !== undefined && { observed_at: body.observed_at }),
    ...(body.organization_id !== undefined && {
      organization_id: body.organization_id,
    }),
    ...(body.department_id !== undefined && {
      department_id: body.department_id,
    }),
    updated_at: toISOStringSafe(new Date()),
  };

  // Step 4: Apply the update
  const updated =
    await MyGlobal.prisma.healthcare_platform_outcome_metrics.update({
      where: { id: metricId },
      data: updateData,
    });

  // Step 5: Format resulting object to strict API contract
  return {
    id: updated.id,
    organization_id: updated.organization_id,
    department_id: updated.department_id ?? undefined,
    metric_name: updated.metric_name,
    description: updated.description ?? undefined,
    cohort_definition_json: updated.cohort_definition_json,
    observed_value: updated.observed_value,
    observed_at: toISOStringSafe(updated.observed_at),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
