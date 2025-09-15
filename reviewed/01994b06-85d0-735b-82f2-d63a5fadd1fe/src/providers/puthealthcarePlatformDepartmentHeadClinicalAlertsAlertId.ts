import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformClinicalAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformClinicalAlert";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Update the status or detail of a clinical alert by alertId in the
 * healthcare_platform_clinical_alerts table.
 *
 * This endpoint allows authorized Department Heads to update the workflow
 * status, detail/comment, or compliance timestamps for a clinical alert. Only
 * permitted fields (status, detail, acknowledged_at, resolved_at) may be
 * changed. Further update attempts on an alert already marked 'resolved' will
 * result in an error. All timestamps and date fields are formatted as string &
 * tags.Format<'date-time'>.
 *
 * @param props - Properties for this provider
 * @param props.departmentHead - The authenticated department head performing
 *   the update
 * @param props.alertId - Unique identifier of the clinical alert to update
 * @param props.body - Object containing the fields to update (status, detail,
 *   acknowledged_at, resolved_at)
 * @returns The updated clinical alert record
 * @throws {Error} If the alert is not found or has already been resolved
 */
export async function puthealthcarePlatformDepartmentHeadClinicalAlertsAlertId(props: {
  departmentHead: DepartmentheadPayload;
  alertId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformClinicalAlert.IUpdate;
}): Promise<IHealthcarePlatformClinicalAlert> {
  const { alertId, body } = props;
  const alert =
    await MyGlobal.prisma.healthcare_platform_clinical_alerts.findUnique({
      where: { id: alertId },
    });
  if (!alert) throw new Error("Clinical alert not found");
  if (alert.status === "resolved") {
    throw new Error("Cannot update an alert that is already resolved");
  }

  const updatedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const updated =
    await MyGlobal.prisma.healthcare_platform_clinical_alerts.update({
      where: { id: alertId },
      data: {
        ...(body.status !== undefined && { status: body.status }),
        ...(body.detail !== undefined && { detail: body.detail }),
        ...(body.acknowledged_at !== undefined && {
          acknowledged_at: body.acknowledged_at,
        }),
        ...(body.resolved_at !== undefined && {
          resolved_at: body.resolved_at,
        }),
        updated_at: updatedAt,
      },
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
    detail: updated.detail === null ? undefined : updated.detail,
    status: updated.status,
    acknowledged_at:
      updated.acknowledged_at === null
        ? undefined
        : toISOStringSafe(updated.acknowledged_at),
    resolved_at:
      updated.resolved_at === null
        ? undefined
        : toISOStringSafe(updated.resolved_at),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
