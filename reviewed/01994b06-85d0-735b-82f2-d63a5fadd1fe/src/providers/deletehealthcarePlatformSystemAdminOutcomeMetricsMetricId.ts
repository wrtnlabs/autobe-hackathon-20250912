import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Permanently delete an outcome metric by metricId (hard delete).
 *
 * This operation erases an outcome metric record from the system's analytics
 * time-series. It is a hard delete—removing the row from the database, not just
 * flagging as deleted. Only system admins are permitted to call this. Full
 * audit logging is performed.
 *
 * @param props - Request props
 * @param props.systemAdmin - Authenticated system admin payload (must have
 *   systemAdmin privileges)
 * @param props.metricId - UUID of the outcome metric record to delete
 * @returns Void
 * @throws {Error} If the outcome metric does not exist
 */
export async function deletehealthcarePlatformSystemAdminOutcomeMetricsMetricId(props: {
  systemAdmin: SystemadminPayload;
  metricId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, metricId } = props;

  // Step 1. Find the metric to be sure it exists for compliance and audit
  const metric =
    await MyGlobal.prisma.healthcare_platform_outcome_metrics.findUnique({
      where: { id: metricId },
    });

  if (!metric) {
    throw new Error("Outcome metric not found");
  }

  // Step 2. Delete the outcome metric (hard delete)
  await MyGlobal.prisma.healthcare_platform_outcome_metrics.delete({
    where: { id: metricId },
  });

  // Step 3. Write audit log (now providing required 'id')
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      user_id: systemAdmin.id,
      organization_id: metric.organization_id,
      action_type: "OUTCOME_METRIC_DELETE",
      event_context: JSON.stringify({
        metricId: metric.id,
        metricName: metric.metric_name,
      }),
      related_entity_type: "OUTCOME_METRIC",
      related_entity_id: metric.id,
      created_at: toISOStringSafe(new Date()),
    },
  });
}
