import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformLabResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabResult";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Update an existing laboratory result for a patient record and encounter.
 *
 * This endpoint allows an authorized department head to update a laboratory
 * result entity identified by labResultId, as part of a given patient record
 * and clinical encounter. Only the test_name, test_result_value_json,
 * result_flag, resulted_at, and status fields are mutable. The operation will
 * fail if any referenced patient record, encounter, or lab result does not
 * exist or has been removed, or if entity association is invalid. RBAC and
 * audit policy are enforced through the departmentHead authentication
 * contract.
 *
 * @param props - Arguments for laboratory result update
 * @param props.departmentHead - The authenticated department head performing
 *   the update
 * @param props.patientRecordId - UUID identifying the patient record
 * @param props.encounterId - UUID identifying the clinical encounter
 * @param props.labResultId - UUID of the laboratory result to update
 * @param props.body - Fields and values to update (see
 *   IHealthcarePlatformLabResult.IUpdate)
 * @returns The updated laboratory result entity reflecting all modifications
 * @throws {Error} If any referenced patient record, encounter, or lab result is
 *   missing, or not properly associated for update
 */
export async function puthealthcarePlatformDepartmentHeadPatientRecordsPatientRecordIdEncountersEncounterIdLabResultsLabResultId(props: {
  departmentHead: DepartmentheadPayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
  labResultId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformLabResult.IUpdate;
}): Promise<IHealthcarePlatformLabResult> {
  const { departmentHead, patientRecordId, encounterId, labResultId, body } =
    props;

  // 1. Verify patient record exists
  const patientRecord =
    await MyGlobal.prisma.healthcare_platform_patient_records.findFirst({
      where: {
        id: patientRecordId,
      },
    });
  if (patientRecord === null) {
    throw new Error("Patient record not found");
  }

  // 2. Verify encounter exists, belongs to the patient record
  const encounter =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.findFirst({
      where: {
        id: encounterId,
        patient_record_id: patientRecordId,
      },
    });
  if (encounter === null) {
    throw new Error(
      "EHR encounter not found, does not belong to patient record, or has been removed",
    );
  }

  // 3. Verify lab result exists, belongs to encounter
  const labResult =
    await MyGlobal.prisma.healthcare_platform_lab_results.findFirst({
      where: {
        id: labResultId,
        ehr_encounter_id: encounterId,
      },
    });
  if (labResult === null) {
    throw new Error(
      "Lab result not found, does not belong to encounter, or has been removed",
    );
  }

  // 4. Update only the allowed fields
  const updated = await MyGlobal.prisma.healthcare_platform_lab_results.update({
    where: { id: labResultId },
    data: {
      test_name: body.test_name ?? undefined,
      test_result_value_json: body.test_result_value_json ?? undefined,
      result_flag: body.result_flag ?? undefined,
      resulted_at: body.resulted_at ?? undefined,
      status: body.status ?? undefined,
    },
  });

  // 5. Return as IHealthcarePlatformLabResult, converting all Date fields
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
