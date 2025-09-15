import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformLabResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabResult";
import { TechnicianPayload } from "../decorators/payload/TechnicianPayload";

/**
 * Update an existing laboratory result for a patient record and encounter
 *
 * This endpoint updates a laboratory result entity identified by labResultId
 * for a specific patient record and EHR encounter. Only allowed for authorized
 * technician users. The operation applies updates to allowed fields (test
 * values, result flag, reporting timestamp, status) in the
 * healthcare_platform_lab_results table. It enforces strict RBAC, validates
 * resource context, and serializes all date fields for correct API type
 * compliance.
 *
 * @param props - Parameters for lab result update
 * @param props.technician - The authenticated technician making the request
 * @param props.patientRecordId - UUID of the patient record
 * @param props.encounterId - UUID of the associated EHR encounter
 * @param props.labResultId - UUID of the laboratory result to update
 * @param props.body - Update payload with fields to modify
 * @returns Updated laboratory result entity after modification
 * @throws {Error} If lab result is not found, does not match the given
 *   encounter/patient record, or update is not permitted
 */
export async function puthealthcarePlatformTechnicianPatientRecordsPatientRecordIdEncountersEncounterIdLabResultsLabResultId(props: {
  technician: TechnicianPayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
  labResultId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformLabResult.IUpdate;
}): Promise<IHealthcarePlatformLabResult> {
  const { technician, patientRecordId, encounterId, labResultId, body } = props;

  // Step 1: Ensure the lab result exists and matches the provided encounter and patient record
  const labResult =
    await MyGlobal.prisma.healthcare_platform_lab_results.findUnique({
      where: { id: labResultId },
    });
  if (!labResult) throw new Error("Lab result not found");

  // Cross-check: ensure the lab result's ehr_encounter_id matches encounterId
  if (labResult.ehr_encounter_id !== encounterId)
    throw new Error("Lab result is not associated with the provided encounter");

  // Further ensure the encounter matches the patient record (join required)
  const encounter =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.findUnique({
      where: { id: encounterId },
    });
  if (!encounter) throw new Error("Encounter not found");
  if (encounter.patient_record_id !== patientRecordId)
    throw new Error("Encounter does not belong to the provided patient record");

  // Only allow updates to specified mutable fields
  const updateInput = {
    ...(body.test_name !== undefined && { test_name: body.test_name }),
    ...(body.test_result_value_json !== undefined && {
      test_result_value_json: body.test_result_value_json,
    }),
    ...(body.result_flag !== undefined && { result_flag: body.result_flag }),
    ...(body.resulted_at !== undefined && {
      resulted_at: toISOStringSafe(body.resulted_at),
    }),
    ...(body.status !== undefined && { status: body.status }),
  };

  const updated = await MyGlobal.prisma.healthcare_platform_lab_results.update({
    where: { id: labResultId },
    data: updateInput,
  });

  return {
    id: updated.id,
    ehr_encounter_id: updated.ehr_encounter_id,
    lab_integration_id: updated.lab_integration_id,
    test_name: updated.test_name,
    test_result_value_json: updated.test_result_value_json,
    result_flag: updated.result_flag,
    resulted_at: toISOStringSafe(updated.resulted_at),
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
  };
}
