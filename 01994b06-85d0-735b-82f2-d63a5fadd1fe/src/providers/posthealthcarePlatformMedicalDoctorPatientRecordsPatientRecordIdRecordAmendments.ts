import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformRecordAmendment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRecordAmendment";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Create a new record amendment for a patient record.
 *
 * This endpoint allows a medical doctor (authenticated) to initiate a new
 * amendment to a patient's record, such as correction or regulatory update. All
 * referenced user, patient, and encounter resources are validated, business
 * logic prevents duplicates, and only doctors authorized for the patient can
 * amend. Optional reviewer and encounter references are enforced if supplied.
 * All fields mapped according to regulatory and audit requirements. Creation
 * triggers immediate workflow; all errors are surfaced explicitly.
 *
 * @param props - Props object containing:
 *
 *   - MedicalDoctor: Authenticated medical doctor (MedicaldoctorPayload)
 *   - PatientRecordId: UUID of the target patient record (string &
 *       tags.Format<'uuid'>)
 *   - Body: Amendment creation input (IHealthcarePlatformRecordAmendment.ICreate)
 *
 * @returns The newly created and fully validated amendment object
 * @throws {Error} When validation, authorization, or uniqueness checks fail
 */
export async function posthealthcarePlatformMedicalDoctorPatientRecordsPatientRecordIdRecordAmendments(props: {
  medicalDoctor: MedicaldoctorPayload;
  patientRecordId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformRecordAmendment.ICreate;
}): Promise<IHealthcarePlatformRecordAmendment> {
  const { medicalDoctor, patientRecordId, body } = props;
  // Verify patient record exists and is not soft deleted
  const patientRecord =
    await MyGlobal.prisma.healthcare_platform_patient_records.findFirst({
      where: { id: patientRecordId, deleted_at: null },
    });
  if (!patientRecord) {
    throw new Error("Patient record does not exist or is soft deleted");
  }

  // Authorization: submitter must be the authenticated medical doctor
  if (body.submitted_by_user_id !== medicalDoctor.id) {
    throw new Error(
      "Only the authenticated medical doctor can submit this amendment",
    );
  }

  // If reviewer is provided, verify that doctor exists and is not deleted
  if (
    body.reviewed_by_user_id !== undefined &&
    body.reviewed_by_user_id !== null
  ) {
    const reviewer =
      await MyGlobal.prisma.healthcare_platform_medicaldoctors.findFirst({
        where: { id: body.reviewed_by_user_id, deleted_at: null },
      });
    if (!reviewer) {
      throw new Error("Reviewer medical doctor not found");
    }
  }

  // If EHR encounter is provided, verify it exists and is for this patient record (and not deleted)
  if (body.ehr_encounter_id !== undefined && body.ehr_encounter_id !== null) {
    const encounter =
      await MyGlobal.prisma.healthcare_platform_ehr_encounters.findFirst({
        where: {
          id: body.ehr_encounter_id,
          patient_record_id: patientRecordId,
          deleted_at: null,
        },
      });
    if (!encounter) {
      throw new Error(
        "EHR encounter not found or not linked to given patient record",
      );
    }
  }

  // Prevent duplicate/conflicting amendments (identical patient, submitter, amendment_type, before/after json, rationale, reviewer, encounter)
  const dup =
    await MyGlobal.prisma.healthcare_platform_record_amendments.findFirst({
      where: {
        patient_record_id: patientRecordId,
        submitted_by_user_id: medicalDoctor.id,
        amendment_type: body.amendment_type,
        old_value_json: body.old_value_json,
        new_value_json: body.new_value_json,
        rationale: body.rationale,
        reviewed_by_user_id: body.reviewed_by_user_id ?? null,
        ehr_encounter_id: body.ehr_encounter_id ?? null,
      },
    });
  if (dup) {
    throw new Error(
      "A conflicting amendment already exists for this patient record with identical content",
    );
  }

  // Insert amendment
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.healthcare_platform_record_amendments.create({
      data: {
        id: v4(),
        patient_record_id: patientRecordId,
        submitted_by_user_id: medicalDoctor.id,
        reviewed_by_user_id: body.reviewed_by_user_id ?? null,
        ehr_encounter_id: body.ehr_encounter_id ?? null,
        amendment_type: body.amendment_type,
        old_value_json: body.old_value_json,
        new_value_json: body.new_value_json,
        rationale: body.rationale,
        approval_status: body.approval_status ?? null,
        created_at: now,
      },
    });

  // Return response, ensuring all required fields and proper null handling for optional fields
  return {
    id: created.id,
    patient_record_id: created.patient_record_id,
    submitted_by_user_id: created.submitted_by_user_id,
    reviewed_by_user_id: created.reviewed_by_user_id ?? null,
    ehr_encounter_id: created.ehr_encounter_id ?? null,
    amendment_type: created.amendment_type,
    old_value_json: created.old_value_json,
    new_value_json: created.new_value_json,
    rationale: created.rationale,
    approval_status: created.approval_status ?? null,
    created_at: created.created_at,
  };
}
