import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformClinicalAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformClinicalAlert";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve detailed information about a clinical alert by alertId from the
 * healthcare_platform_clinical_alerts table.
 *
 * This endpoint fetches a clinical alert record based on alertId and returns
 * all relevant details needed for compliance, workflow tracking, and audit.
 * Only organization admins who belong to the same organization as the alert are
 * authorized to access the full details. The operation confirms that the
 * requester's organization admin assignment is active and matches the alert's
 * organization_id.
 *
 * @param props - The input parameters for the operation
 * @param props.organizationAdmin - The authenticated organization admin making
 *   this request
 * @param props.alertId - Unique identifier (UUID) of the clinical alert record
 *   to retrieve
 * @returns The full IHealthcarePlatformClinicalAlert with all clinical alert
 *   metadata and workflow details
 * @throws {Error} When the alert is not found or the organization admin is not
 *   authorized for the alert's organization
 */
export async function gethealthcarePlatformOrganizationAdminClinicalAlertsAlertId(props: {
  organizationAdmin: OrganizationadminPayload;
  alertId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformClinicalAlert> {
  const { organizationAdmin, alertId } = props;
  // Fetch the alert record by unique ID
  const alert =
    await MyGlobal.prisma.healthcare_platform_clinical_alerts.findUnique({
      where: { id: alertId },
    });
  if (!alert) throw new Error("Alert not found");
  // Fetch the org assignment for this admin (active only)
  const assignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: organizationAdmin.id,
        deleted_at: null,
      },
    });
  if (
    !assignment ||
    alert.organization_id !== assignment.healthcare_platform_organization_id
  ) {
    throw new Error("Forbidden");
  }
  // Build output DTO, applying all conversion and presence/absence rules
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
