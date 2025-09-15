import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformLabResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabResult";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Update an existing laboratory result for a patient record and encounter
 *
 * Updates an existing laboratory result entry identified by labResultId, scoped
 * to the specified patient record and EHR encounter. Only the assigned provider
 * (medical doctor) may perform this update. Prohibits modification if the lab
 * result has reached the 'finalized' state. Only mutable fields (test_name,
 * test_result_value_json, result_flag, resulted_at, status) will be updated.
 * Returns the updated laboratory result in API-safe format. Strictly forbids
 * usage of native Date, all datetimes are formatted ISO-8601 strings.
 *
 * @param props - Request properties
 * @param props.medicalDoctor - The authenticated medical doctor payload
 * @param props.patientRecordId - Target patient record UUID
 * @param props.encounterId - Target EHR encounter UUID
 * @param props.labResultId - Target laboratory result UUID
 * @param props.body - Update input; only supplied fields will be changed
 * @returns The updated laboratory result, matching IHealthcarePlatformLabResult
 * @throws {Error} When the lab result or encounter does not exist, when
 *   references do not match, when RBAC prevents update, or the lab result is
 *   finalized
 */
export async function puthealthcarePlatformMedicalDoctorPatientRecordsPatientRecordIdEncountersEncounterIdLabResultsLabResultId(props: {
  medicalDoctor: MedicaldoctorPayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
  labResultId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformLabResult.IUpdate;
}): Promise<IHealthcarePlatformLabResult> {
  const { medicalDoctor, patientRecordId, encounterId, labResultId, body } =
    props;

  // Fetch lab result and validate links
  const labResult =
    await MyGlobal.prisma.healthcare_platform_lab_results.findUnique({
      where: { id: labResultId },
    });
  if (!labResult) throw new Error("Lab result not found");
  if (labResult.ehr_encounter_id !== encounterId)
    throw new Error("Lab result does not belong to specified encounter");

  // Fetch encounter, validate patient record ownership and provider
  const encounter =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.findUnique({
      where: { id: encounterId },
    });
  if (!encounter) throw new Error("Encounter not found");
  if (encounter.patient_record_id !== patientRecordId)
    throw new Error("Encounter does not belong to specified patient record");
  if (encounter.provider_user_id !== medicalDoctor.id)
    throw new Error(
      "Unauthorized: Only the provider for this encounter may update lab results",
    );

  // Prohibit update if result is finalized
  if (labResult.status === "finalized")
    throw new Error("Lab result is finalized and cannot be updated");

  // Prepare update fields: only supplied and allowed fields
  const updateFields = {
    test_name: body.test_name ?? undefined,
    test_result_value_json: body.test_result_value_json ?? undefined,
    result_flag: body.result_flag ?? undefined,
    resulted_at:
      body.resulted_at !== undefined
        ? toISOStringSafe(body.resulted_at)
        : undefined,
    status: body.status ?? undefined,
  } satisfies IHealthcarePlatformLabResult.IUpdate;

  // Perform update
  const updated = await MyGlobal.prisma.healthcare_platform_lab_results.update({
    where: { id: labResultId },
    data: updateFields,
  });

  // Return as strict DTO (convert Date fields)
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
