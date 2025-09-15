import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformClinicalAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformClinicalAlert";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update the status or detail of a clinical alert by alertId in the
 * healthcare_platform_clinical_alerts table.
 *
 * This function allows authorized system admins to update the status,
 * detail/comments, or acknowledgement/resolution timestamps of a clinical
 * alert. Only mutable properties (status, detail, acknowledged_at, resolved_at)
 * may be changed. Immutable fields remain unchanged. On attempted update of
 * deleted or finalized alerts, an error is thrown. All relevant timestamp
 * fields are handled as branded ISO strings (string &
 * tags.Format<'date-time'>).
 *
 * @param props - Object containing the authenticated system admin payload, the
 *   alert's UUID, and an update body with mutable properties
 * @param props.systemAdmin - Authenticated SystemadminPayload (validated at
 *   controller layer)
 * @param props.alertId - UUID of the alert to update
 * @param props.body - Updatable alert fields (status, detail, acknowledgement,
 *   resolution times)
 * @returns The full updated clinical alert entity satisfying
 *   IHealthcarePlatformClinicalAlert
 * @throws {Error} If the alert is deleted, resolved, or does not exist
 */
export async function puthealthcarePlatformSystemAdminClinicalAlertsAlertId(props: {
  systemAdmin: SystemadminPayload;
  alertId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformClinicalAlert.IUpdate;
}): Promise<IHealthcarePlatformClinicalAlert> {
  const { systemAdmin, alertId, body } = props;

  // Fetch alert and validate editability
  const alert =
    await MyGlobal.prisma.healthcare_platform_clinical_alerts.findUniqueOrThrow(
      {
        where: { id: alertId },
      },
    );

  if (alert.deleted_at !== null) {
    throw new Error("Cannot update a deleted (archived) alert.");
  }

  if (alert.status === "resolved") {
    throw new Error("Cannot update a finalized alert (status: resolved).");
  }

  // Prepare update object: only update permitted fields
  const now = toISOStringSafe(new Date());
  const updateFields = {
    status: body.status ?? undefined,
    detail: body.detail ?? undefined,
    acknowledged_at: body.acknowledged_at ?? undefined,
    resolved_at: body.resolved_at ?? undefined,
    updated_at: now,
  };

  const updated =
    await MyGlobal.prisma.healthcare_platform_clinical_alerts.update({
      where: { id: alertId },
      data: updateFields,
    });

  return {
    id: updated.id,
    decision_support_rule_id: updated.decision_support_rule_id,
    triggered_by_user_id:
      updated.triggered_by_user_id === null
        ? undefined
        : updated.triggered_by_user_id,
    organization_id: updated.organization_id,
    department_id:
      updated.department_id === null ? undefined : updated.department_id,
    alert_type: updated.alert_type,
    subject_summary: updated.subject_summary,
    detail: updated.detail ?? undefined,
    status: updated.status,
    acknowledged_at:
      updated.acknowledged_at !== null && updated.acknowledged_at !== undefined
        ? toISOStringSafe(updated.acknowledged_at)
        : undefined,
    resolved_at:
      updated.resolved_at !== null && updated.resolved_at !== undefined
        ? toISOStringSafe(updated.resolved_at)
        : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
