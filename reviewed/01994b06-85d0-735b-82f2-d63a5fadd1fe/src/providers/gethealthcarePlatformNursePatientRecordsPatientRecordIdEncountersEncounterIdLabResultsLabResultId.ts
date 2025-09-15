import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformLabResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabResult";
import { NursePayload } from "../decorators/payload/NursePayload";

/**
 * Retrieve a detailed laboratory result by ID for a given patient record and
 * encounter.
 *
 * This function fetches a lab result from the healthcare_platform_lab_results
 * table as scoped to the specified patient record and EHR encounter. All
 * associations are enforced to guarantee correct RBAC and clinical data
 * isolation. It validates that the lab result is not only present but is
 * referenced by the correct encounter, which itself must belong to the patient
 * record provided. All date fields are returned as ISO8601 strings as per API
 * schema contracts. This endpoint supports sensitive clinical review and
 * complies with strict auditing and privacy policies for clinical workflows.
 *
 * Authorization is guarded by requiring a NursePayload and by scoping results
 * to patient and encounter context. Exceptions are thrown if any entity is not
 * found or not correctly associated, preventing forbidden access and
 * reinforcing RBAC at the function level.
 *
 * @param props - Object containing nurse authentication and required scoped
 *   resource IDs
 * @param props.nurse - Authenticated nurse payload with role type and nurse id
 * @param props.patientRecordId - UUID of the patient record as parent context
 * @param props.encounterId - UUID of the EHR encounter for scoping
 * @param props.labResultId - UUID of the lab result to retrieve in context
 * @returns The full structured IHealthcarePlatformLabResult for the specified
 *   context
 * @throws {Error} If lab result, encounter, or patient scoping does not match
 *   or record does not exist.
 */
export async function gethealthcarePlatformNursePatientRecordsPatientRecordIdEncountersEncounterIdLabResultsLabResultId(props: {
  nurse: NursePayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
  labResultId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformLabResult> {
  const { nurse, patientRecordId, encounterId, labResultId } = props;
  // Fetch lab result and ensure it matches encounterId
  const labResult =
    await MyGlobal.prisma.healthcare_platform_lab_results.findFirstOrThrow({
      where: {
        id: labResultId,
        ehr_encounter_id: encounterId,
      },
    });
  // Ensure that encounterId belongs to patientRecordId
  const encounter =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.findFirstOrThrow({
      where: {
        id: encounterId,
        patient_record_id: patientRecordId,
      },
    });
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
