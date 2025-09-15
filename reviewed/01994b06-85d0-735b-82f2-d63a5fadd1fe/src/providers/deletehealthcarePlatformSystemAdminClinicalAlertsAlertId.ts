import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Permanently delete a clinical decision support alert by alertId from
 * healthcare_platform_clinical_alerts (hard delete).
 *
 * This endpoint performs a hard (permanent) delete of a clinical alert record,
 * removing it entirely from the system. Only authorized system administrators
 * may invoke this operation. If the alert is in a final state (resolved,
 * closed) or has already been deleted, the operation will fail. All deletions
 * are audited by creating a dedicated event log entry referencing the deleted
 * alert and the actor performing the deletion.
 *
 * @param props - Properties for the operation
 * @param props.systemAdmin - Authenticated system administrator payload (must
 *   have sufficient privileges)
 * @param props.alertId - Unique identifier of the clinical alert to delete
 * @returns Promise<void>
 * @throws {Error} If the alert does not exist or is not deletable (final status
 *   or already deleted)
 */
export async function deletehealthcarePlatformSystemAdminClinicalAlertsAlertId(props: {
  systemAdmin: SystemadminPayload;
  alertId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, alertId } = props;

  // Find clinical alert and verify it is deletable
  const alert =
    await MyGlobal.prisma.healthcare_platform_clinical_alerts.findFirst({
      where: { id: alertId },
      select: { id: true, status: true, deleted_at: true },
    });
  if (!alert) {
    throw new Error("Alert not found");
  }
  if (
    alert.deleted_at !== null ||
    alert.status === "resolved" ||
    alert.status === "closed"
  ) {
    throw new Error(
      "Alert cannot be deleted because it is already deleted or in a final state",
    );
  }

  // Hard delete
  await MyGlobal.prisma.healthcare_platform_clinical_alerts.delete({
    where: { id: alertId },
  });

  // Audit log
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4(),
      user_id: systemAdmin.id,
      action_type: "DELETE_CLINICAL_ALERT",
      related_entity_type: "CLINICAL_ALERT",
      related_entity_id: alertId,
      created_at: toISOStringSafe(new Date()),
    },
  });
}
