import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformRecordAmendment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRecordAmendment";
import { NursePayload } from "../decorators/payload/NursePayload";

/**
 * Get full details of a specific record amendment on a patient record
 *
 * This endpoint retrieves the full details of a specific record amendment for a
 * patient record, identified by both the patient record ID and record amendment
 * ID, for nurse RBAC access. It enforces patient and amendment scoping,
 * provides audit and workflow metadata, and ensures access control according to
 * nurse's submitter or reviewer assignment.
 *
 * RBAC: Only a nurse assigned as submitter or reviewer for this amendment is
 * authorized to access the details.
 *
 * @param props - Request props
 * @param props.nurse - The authenticated nurse making the request
 * @param props.patientRecordId - UUID of the patient record to which the
 *   amendment belongs
 * @param props.recordAmendmentId - UUID of the amendment record to retrieve
 * @returns IHealthcarePlatformRecordAmendment - Details of the amendment,
 *   including audit, workflow, clinical, and business fields
 * @throws {Error} 404 if the amendment doesn't exist, 403 if not permitted
 */
export async function gethealthcarePlatformNursePatientRecordsPatientRecordIdRecordAmendmentsRecordAmendmentId(props: {
  nurse: NursePayload;
  patientRecordId: string & tags.Format<"uuid">;
  recordAmendmentId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformRecordAmendment> {
  const { nurse, patientRecordId, recordAmendmentId } = props;
  // Query the amendment (both IDs)
  const amendment =
    await MyGlobal.prisma.healthcare_platform_record_amendments.findFirst({
      where: {
        id: recordAmendmentId,
        patient_record_id: patientRecordId,
      },
    });
  if (!amendment) throw new Error("Not found");
  // Authorization: Nurse must be submitter or reviewer
  const nurseIsSubmitter = amendment.submitted_by_user_id === nurse.id;
  const nurseIsReviewer = amendment.reviewed_by_user_id === nurse.id;
  if (!nurseIsSubmitter && !nurseIsReviewer) {
    throw new Error("Forbidden");
  }
  // Output mapping, being careful with null/undefined
  return {
    id: amendment.id,
    patient_record_id: amendment.patient_record_id,
    submitted_by_user_id: amendment.submitted_by_user_id,
    reviewed_by_user_id:
      amendment.reviewed_by_user_id !== null
        ? amendment.reviewed_by_user_id
        : null,
    ehr_encounter_id:
      amendment.ehr_encounter_id !== null ? amendment.ehr_encounter_id : null,
    amendment_type: amendment.amendment_type,
    old_value_json: amendment.old_value_json,
    new_value_json: amendment.new_value_json,
    rationale: amendment.rationale,
    approval_status:
      amendment.approval_status !== null ? amendment.approval_status : null,
    created_at: toISOStringSafe(amendment.created_at),
  };
}
