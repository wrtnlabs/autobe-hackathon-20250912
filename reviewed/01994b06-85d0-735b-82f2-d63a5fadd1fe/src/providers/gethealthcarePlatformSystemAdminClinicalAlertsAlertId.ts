import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformClinicalAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformClinicalAlert";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve detailed information about a clinical alert by alertId.
 *
 * Fetches a clinical alert record from the healthcare_platform_clinical_alerts
 * table identified by its unique UUID, enforcing RBAC for system
 * administrators. All datetime fields are serialized as ISO 8601 strings with
 * correct branding, and access is denied if no matching active record is found.
 * System admins have access to all alerts regardless of organization or
 * department. Soft-deleted (deleted_at != null) alerts are not retrievable.
 *
 * @param props - The function parameters
 * @param props.systemAdmin - The authenticated system admin issuing the request
 * @param props.alertId - The UUID of the clinical alert to retrieve
 * @returns The detailed clinical alert record, fully typed
 * @throws {Error} If the alert does not exist or has been deleted
 */
export async function gethealthcarePlatformSystemAdminClinicalAlertsAlertId(props: {
  systemAdmin: SystemadminPayload;
  alertId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformClinicalAlert> {
  const { alertId } = props;

  // Fetch the alert, ensuring it is not soft-deleted
  const alert =
    await MyGlobal.prisma.healthcare_platform_clinical_alerts.findFirst({
      where: {
        id: alertId,
        deleted_at: null,
      },
    });
  if (!alert) {
    throw new Error("Clinical alert not found");
  }

  return {
    id: alert.id,
    decision_support_rule_id: alert.decision_support_rule_id,
    triggered_by_user_id: alert.triggered_by_user_id ?? undefined,
    organization_id: alert.organization_id,
    department_id: alert.department_id ?? undefined,
    alert_type: alert.alert_type,
    subject_summary: alert.subject_summary,
    detail: alert.detail ?? undefined,
    status: alert.status,
    acknowledged_at: alert.acknowledged_at
      ? toISOStringSafe(alert.acknowledged_at)
      : undefined,
    resolved_at: alert.resolved_at
      ? toISOStringSafe(alert.resolved_at)
      : undefined,
    created_at: toISOStringSafe(alert.created_at),
    updated_at: toISOStringSafe(alert.updated_at),
    deleted_at: alert.deleted_at
      ? toISOStringSafe(alert.deleted_at)
      : undefined,
  };
}
