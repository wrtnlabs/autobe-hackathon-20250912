import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformOutcomeMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOutcomeMetric";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update a specific healthcare outcome metric record
 * (IHealthcarePlatformOutcomeMetric).
 *
 * Updates fields of an outcome metric identified by metricId, enforcing
 * role-based access control for system admin. Only fields provided in `body`
 * will be updated; id and created_at are immutable. Throws an error if the
 * metric does not exist or is soft-deleted. All datetime fields are returned as
 * ISO strings.
 *
 * @param props - Object containing authenticated system admin, metricId (UUID),
 *   and partial body of updatable fields.
 * @param props.systemAdmin - Authenticated system admin payload performing the
 *   update.
 * @param props.metricId - UUID of the outcome metric to update.
 * @param props.body - Partial fields to update on the metric. Follows
 *   IHealthcarePlatformOutcomeMetric.IUpdate DTO.
 * @returns The updated IHealthcarePlatformOutcomeMetric record with full
 *   details.
 * @throws {Error} If the metric does not exist or has been soft-deleted.
 */
export async function puthealthcarePlatformSystemAdminOutcomeMetricsMetricId(props: {
  systemAdmin: SystemadminPayload;
  metricId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformOutcomeMetric.IUpdate;
}): Promise<IHealthcarePlatformOutcomeMetric> {
  const { metricId, body } = props;

  const metric =
    await MyGlobal.prisma.healthcare_platform_outcome_metrics.findFirst({
      where: { id: metricId, deleted_at: null },
    });
  if (!metric) {
    throw new Error("Outcome metric record not found or has been deleted");
  }

  const now = toISOStringSafe(new Date());

  const updated =
    await MyGlobal.prisma.healthcare_platform_outcome_metrics.update({
      where: { id: metricId },
      data: {
        metric_name: body.metric_name ?? undefined,
        description: body.description ?? undefined,
        cohort_definition_json: body.cohort_definition_json ?? undefined,
        observed_value: body.observed_value ?? undefined,
        observed_at: body.observed_at ?? undefined,
        organization_id: body.organization_id ?? undefined,
        department_id: body.department_id ?? undefined,
        updated_at: now,
      },
    });

  return {
    id: updated.id,
    organization_id: updated.organization_id,
    department_id: Object.prototype.hasOwnProperty.call(
      updated,
      "department_id",
    )
      ? updated.department_id === null
        ? null
        : updated.department_id
      : undefined,
    metric_name: updated.metric_name,
    description: Object.prototype.hasOwnProperty.call(updated, "description")
      ? updated.description
      : undefined,
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
