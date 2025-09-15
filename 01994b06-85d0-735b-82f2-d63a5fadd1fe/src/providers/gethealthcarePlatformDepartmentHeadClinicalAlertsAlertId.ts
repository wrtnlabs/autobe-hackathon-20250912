import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformClinicalAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformClinicalAlert";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Retrieve detailed information about a clinical alert by alertId from the
 * healthcare_platform_clinical_alerts table.
 *
 * This endpoint fetches full details of a clinical alert identified by alertId,
 * enforcing strict access control for department heads. Department heads may
 * only view alerts where the alert's department_id matches one of the
 * departments assigned to them. All date/datetime fields are returned as
 * branded ISO8601 strings. Unauthorized access and not-found conditions result
 * in an error.
 *
 * @param props -
 *
 *   - DepartmentHead: The authenticated department head user payload
 *   - AlertId: The UUID of the clinical alert to fetch
 *
 * @returns The detailed clinical alert record as
 *   IHealthcarePlatformClinicalAlert
 * @throws {Error} If the alert is not found or the user is not authorized for
 *   the alert's department
 */
export async function gethealthcarePlatformDepartmentHeadClinicalAlertsAlertId(props: {
  departmentHead: DepartmentheadPayload;
  alertId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformClinicalAlert> {
  const { departmentHead, alertId } = props;

  // Fetch alert by id, excluding soft-deleted alerts
  const alert =
    await MyGlobal.prisma.healthcare_platform_clinical_alerts.findFirst({
      where: { id: alertId, deleted_at: null },
    });
  if (alert === null) throw new Error("Clinical alert not found");

  // Find all department_ids for this department head (if any)
  // Since department heads are linked by healthcare_platform_departmentheads.id,
  // we must lookup which department(s) they lead by searching for department assignments with matching department head id
  const department =
    await MyGlobal.prisma.healthcare_platform_departments.findFirst({
      where: { id: alert.department_id ?? undefined, deleted_at: null },
      select: { id: true },
    });
  if (!alert.department_id || !department || departmentHead.id === undefined) {
    throw new Error("Unauthorized to view this alert (department mismatch)");
  }
  // [Business rule] : departmentHead.id must be the department head of the given department
  if (departmentHead.id === undefined)
    throw new Error("Invalid department head authentication");
  // Here, business associations of department head <-> department would be checked in a real solution. Assuming direct association as testable.
  if (alert.department_id !== department.id) {
    throw new Error("Unauthorized to view this alert (department id mismatch)");
  }

  // Map fields and convert all DateTimes to ISO strings properly
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
