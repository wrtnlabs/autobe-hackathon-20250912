import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformClinicalAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformClinicalAlert";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update the status, detail, or workflow fields of a clinical alert by alertId.
 *
 * This operation allows an authorized organization admin to update permitted
 * fields (status, detail, acknowledged_at, resolved_at) of a clinical alert in
 * the healthcare_platform_clinical_alerts table. Fields such as creation
 * timestamp, originating rule, or IDs are immutable. All updates are subject to
 * compliance requirements, and this endpoint enforces a full audit trail by
 * returning the updated record.
 *
 * The authenticated admin must not be soft-deleted (deleted_at: null) and must
 * only update alerts belonging to their organization. Attempts to update alerts
 * outside the admin's organization boundary will be rejected.
 *
 * @param props - The update request, including authentication payload, alertId,
 *   and IUpdate body with new field values.
 * @param props.organizationAdmin - The authenticated organization admin
 *   payload.
 * @param props.alertId - UUID of the alert to update.
 * @param props.body - The new values for permitted fields (status, detail,
 *   acknowledged_at, resolved_at)
 * @returns The updated IHealthcarePlatformClinicalAlert object.
 * @throws {Error} If alert not found, admin is unauthorized or deleted, admin
 *   does not control alert's organization, or alert is immutable.
 */
export async function puthealthcarePlatformOrganizationAdminClinicalAlertsAlertId(props: {
  organizationAdmin: OrganizationadminPayload;
  alertId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformClinicalAlert.IUpdate;
}): Promise<IHealthcarePlatformClinicalAlert> {
  const { organizationAdmin, alertId, body } = props;
  // Step 1: Fetch the alert
  const alert =
    await MyGlobal.prisma.healthcare_platform_clinical_alerts.findFirst({
      where: { id: alertId },
    });
  if (!alert) throw new Error("Alert not found");
  // Step 2: Fetch the admin and ensure they're not deleted
  const admin =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.findFirst({
      where: { id: organizationAdmin.id, deleted_at: null },
    });
  if (!admin) throw new Error("Forbidden: admin not found or deleted");
  // Step 3: Check that the alert belongs to the admin's organization
  if (alert.organization_id !== admin.id) {
    throw new Error(
      "Forbidden: organization admin cannot update alert outside their organization",
    );
  }
  // Step 4: Build update object (only permitted fields; non-mutable fields skipped)
  const updateFields = {
    ...(body.status !== undefined ? { status: body.status } : {}),
    ...(body.detail !== undefined ? { detail: body.detail } : {}),
    ...(body.acknowledged_at !== undefined
      ? { acknowledged_at: body.acknowledged_at }
      : {}),
    ...(body.resolved_at !== undefined
      ? { resolved_at: body.resolved_at }
      : {}),
    updated_at: toISOStringSafe(new Date()),
  };
  // Step 5: Update row with only those fields
  await MyGlobal.prisma.healthcare_platform_clinical_alerts.update({
    where: { id: alertId },
    data: updateFields,
  });
  // Step 6: Retrieve fully-populated updated alert
  const updated =
    await MyGlobal.prisma.healthcare_platform_clinical_alerts.findFirstOrThrow({
      where: { id: alertId },
    });
  // Step 7: Map database record to DTO structure
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
