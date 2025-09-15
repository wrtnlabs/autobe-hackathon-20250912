import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Permanently delete a healthcare outcome metric record by metricId (hard
 * delete).
 *
 * This operation removes a metric from the outcome metrics time-series
 * (healthcare_platform_outcome_metrics) table by its unique metricId. The
 * action is permitted only for authenticated organization admins within the
 * metric's organization. All deletions are hard (irreversible), generate an
 * immutable audit log entry, and may affect analytics continuity.
 *
 * @param props - OrganizationAdmin: Authenticated OrganizationadminPayload
 *   metricId: The unique outcome metric record id (UUID) to delete
 * @returns Void
 * @throws {Error} If the organization admin or metric does not exist, or the
 *   admin does not have rights
 */
export async function deletehealthcarePlatformOrganizationAdminOutcomeMetricsMetricId(props: {
  organizationAdmin: OrganizationadminPayload;
  metricId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Get organization admin (must not be deleted)
  const admin =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.findFirst({
      where: { id: props.organizationAdmin.id, deleted_at: null },
    });
  if (!admin) {
    throw new Error("Organization admin not found or has been deleted");
  }
  // Step 2: Resolve organization id (from assignment: the admin's id is org admin id, org_id is not included in schema snippet; terminate with error if not found)
  // This implementation assumes the full data model includes a reference linking org admin to the organization id. If not, this operation cannot be performed safely.
  if (!("organization_id" in admin)) {
    throw new Error(
      "Organization admin record does not contain organization_id; cannot perform org-bound metric deletion",
    );
  }
  const organizationId = (admin as any).organization_id;
  // Step 3: Lookup metric record
  const metric =
    await MyGlobal.prisma.healthcare_platform_outcome_metrics.findFirst({
      where: { id: props.metricId },
    });
  if (!metric) {
    throw new Error("Metric not found");
  }
  if (metric.organization_id !== organizationId) {
    throw new Error(
      "Forbidden: You cannot delete metrics outside your organization",
    );
  }
  // Step 4: Hard delete metric by id
  await MyGlobal.prisma.healthcare_platform_outcome_metrics.delete({
    where: { id: props.metricId },
  });
  // Step 5: Audit compliance log
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4(),
      user_id: props.organizationAdmin.id,
      organization_id: organizationId,
      action_type: "OUTCOME_METRIC_DELETE",
      event_context: JSON.stringify({
        metricId: props.metricId,
        metricName: metric.metric_name,
      }),
      related_entity_type: "OUTCOME_METRIC",
      related_entity_id: props.metricId,
      ip_address: undefined,
      created_at: now,
    },
  });
}
