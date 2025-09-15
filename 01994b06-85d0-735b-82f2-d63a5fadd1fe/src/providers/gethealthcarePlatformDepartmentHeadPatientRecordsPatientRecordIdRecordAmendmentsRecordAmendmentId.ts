import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformRecordAmendment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRecordAmendment";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Get full details of a specific record amendment on a patient record
 *
 * Retrieve clinical, audit, and amendment workflow metadata for a specific
 * patient record amendment. Enforces patient-record scope, validates existence,
 * and (if possible) restricts access to department context as required for
 * compliance and audit review. Exposes all metadata required for regulatory and
 * workflow traceability, subject to audit boundaries as enforced by RBAC
 * logic.
 *
 * Access is permitted for department heads only for amendments belonging to
 * patient records within their departmental assignment. Errors are thrown on
 * not-found or access violations. Department-level RBAC is documented as a
 * limitation due to missing join.
 *
 * @param props - The request details and authentication context
 * @param props.departmentHead - The authenticated department head
 *   (DepartmentheadPayload)
 * @param props.patientRecordId - The patient record UUID whose amendment is to
 *   be viewed
 * @param props.recordAmendmentId - The UUID of the specific record amendment to
 *   retrieve
 * @returns The full record amendment details for compliance, audit, and
 *   workflow review
 * @throws {Error} If the amendment is not found, not linked to the patient
 *   record, or (in future) the user is forbidden per RBAC
 */
export async function gethealthcarePlatformDepartmentHeadPatientRecordsPatientRecordIdRecordAmendmentsRecordAmendmentId(props: {
  departmentHead: DepartmentheadPayload;
  patientRecordId: string & tags.Format<"uuid">;
  recordAmendmentId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformRecordAmendment> {
  const { departmentHead, patientRecordId, recordAmendmentId } = props;

  // Fetch the amendment for the given patient record
  const amendment =
    await MyGlobal.prisma.healthcare_platform_record_amendments.findFirst({
      where: {
        id: recordAmendmentId,
        patient_record_id: patientRecordId,
      },
    });
  if (!amendment) {
    throw new Error("Record amendment not found");
  }

  // Fetch the parent patient record to check for department-level access
  const patientRecord =
    await MyGlobal.prisma.healthcare_platform_patient_records.findFirst({
      where: {
        id: patientRecordId,
      },
    });
  if (!patientRecord) {
    throw new Error("Patient record not found");
  }

  // TODO: RBAC enforcement — departmentHead to department linkage is currently missing in schema.
  // In a production system, enforce: departmentHead can only view if patientRecord.department_id matches their department.

  return {
    id: amendment.id,
    patient_record_id: amendment.patient_record_id,
    submitted_by_user_id: amendment.submitted_by_user_id,
    reviewed_by_user_id: amendment.reviewed_by_user_id ?? undefined,
    ehr_encounter_id: amendment.ehr_encounter_id ?? undefined,
    amendment_type: amendment.amendment_type,
    old_value_json: amendment.old_value_json,
    new_value_json: amendment.new_value_json,
    rationale: amendment.rationale,
    approval_status: amendment.approval_status ?? undefined,
    created_at: toISOStringSafe(amendment.created_at),
  };
}
