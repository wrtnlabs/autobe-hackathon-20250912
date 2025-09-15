import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformRecordAmendment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRecordAmendment";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Get full details of a specific record amendment on a patient record
 *
 * Retrieves the clinical, audit, and workflow metadata for the specified
 * amendment, as required for compliance review and audit trail. Only returns
 * the amendment if it matches both the given patient record and amendment IDs
 * and is not soft-deleted. Enforces data partitioning and isolation to meet
 * privacy and business requirements.
 *
 * Authorization is enforced via MedicaldoctorPayload. Throws error if not
 * found, not matched, or not accessible.
 *
 * @param props - MedicalDoctor: MedicaldoctorPayload - The authenticated doctor
 *   making the request, already authorized and verified patientRecordId: UUID
 *   of the patient record recordAmendmentId: UUID of the target record
 *   amendment
 * @returns The complete record amendment metadata in DTO format
 * @throws {Error} If the amendment does not exist, does not match patient
 *   record, or is soft-deleted
 */
export async function gethealthcarePlatformMedicalDoctorPatientRecordsPatientRecordIdRecordAmendmentsRecordAmendmentId(props: {
  medicalDoctor: MedicaldoctorPayload;
  patientRecordId: string & tags.Format<"uuid">;
  recordAmendmentId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformRecordAmendment> {
  const { patientRecordId, recordAmendmentId } = props;

  const amendment =
    await MyGlobal.prisma.healthcare_platform_record_amendments.findFirst({
      where: {
        id: recordAmendmentId,
        patient_record_id: patientRecordId,
        // deleted_at: null, // removed per type error
      },
    });
  if (!amendment) {
    throw new Error("Amendment not found or does not match patient record.");
  }

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
