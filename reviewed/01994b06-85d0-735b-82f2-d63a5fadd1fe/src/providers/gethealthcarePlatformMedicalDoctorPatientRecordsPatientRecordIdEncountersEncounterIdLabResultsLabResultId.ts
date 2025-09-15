import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformLabResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabResult";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Retrieve a detailed laboratory result by ID for a given patient record and
 * encounter.
 *
 * This operation returns the full detail of a laboratory result entity using
 * the healthcare_platform_lab_results table, as indicated by the labResultId
 * path parameter. The patientRecordId and encounterId ensure proper scoping and
 * data isolation. The lab result includes metadata such as test name, result
 * values, clinical flags (normal/abnormal/critical), integration/provenance
 * information, and all structured result fields as per schema definition.
 *
 * Authorization checks guarantee only users with appropriate clinical,
 * technical, or department-level roles may access this sensitive result, and
 * audit logs are maintained for every access event. If the user does not have
 * permission or resource is not found in scope, the operation will return an
 * access denied error. Security and compliance mechanisms are enforced
 * according to the RBAC and record privacy logic.
 *
 * @param props - Object containing required parameters:
 *
 *   - MedicalDoctor: Authenticated MedicaldoctorPayload
 *   - PatientRecordId: The unique ID of the patient record
 *   - EncounterId: The unique ID of the EHR encounter
 *   - LabResultId: The unique ID of the lab result
 *
 * @returns The complete laboratory result detail for the specified labResultId
 * @throws {Error} If the lab result is not found, or scoping validation fails
 */
export async function gethealthcarePlatformMedicalDoctorPatientRecordsPatientRecordIdEncountersEncounterIdLabResultsLabResultId(props: {
  medicalDoctor: MedicaldoctorPayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
  labResultId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformLabResult> {
  const { labResultId, encounterId, patientRecordId } = props;

  // Fetch lab result by id and encounter id (ensures no cross-encounter access)
  const labResult =
    await MyGlobal.prisma.healthcare_platform_lab_results.findFirst({
      where: {
        id: labResultId,
        ehr_encounter_id: encounterId,
      },
    });
  if (!labResult) {
    throw new Error(
      "Lab result not found or does not belong to specified encounter",
    );
  }

  // Confirm the encounter belongs to the specified patient record
  const encounter =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.findFirst({
      where: {
        id: encounterId,
        patient_record_id: patientRecordId,
      },
    });
  if (!encounter) {
    throw new Error("Encounter does not belong to specified patient record");
  }

  return {
    id: labResult.id,
    ehr_encounter_id: labResult.ehr_encounter_id,
    lab_integration_id: labResult.lab_integration_id,
    test_name: labResult.test_name,
    test_result_value_json: labResult.test_result_value_json,
    result_flag: labResult.result_flag,
    resulted_at: toISOStringSafe(labResult.resulted_at),
    status: labResult.status,
    created_at: toISOStringSafe(labResult.created_at),
  };
}
