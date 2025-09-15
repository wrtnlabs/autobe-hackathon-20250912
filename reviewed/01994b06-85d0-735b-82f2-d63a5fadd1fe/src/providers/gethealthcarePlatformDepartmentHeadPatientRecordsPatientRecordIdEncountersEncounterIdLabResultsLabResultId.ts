import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformLabResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabResult";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Retrieve a detailed laboratory result by ID for a given patient record and
 * encounter
 *
 * This operation retrieves the detailed laboratory result specified by its
 * unique identifier for a particular patient record and EHR encounter. The
 * associated entity in the Prisma schema is healthcare_platform_lab_results.
 * This endpoint is used to view the full structured results, status, flag,
 * interpretation, and integration details essential for clinical review,
 * investigation, or audits.
 *
 * Department head authorization is enforced by requiring a
 * DepartmentheadPayload parameter. The patientRecordId and encounterId path
 * parameters are used to validate scope. If the lab result is not found, or
 * linkage does not match (lab result is not for the specified encounter or
 * patient), throws an Error.
 *
 * @param props - Object containing department head payload and path parameters
 * @param props.departmentHead - Authenticated DepartmentheadPayload
 *   (authorization performed upstream)
 * @param props.patientRecordId - UUID of the patient record to scope results
 * @param props.encounterId - UUID of the encounter that owns the lab result
 * @param props.labResultId - UUID of the lab result to retrieve
 * @returns {IHealthcarePlatformLabResult} The requested lab result entity
 * @throws {Error} If the lab result is not found or not scoped to the specified
 *   encounter/patient record
 */
export async function gethealthcarePlatformDepartmentHeadPatientRecordsPatientRecordIdEncountersEncounterIdLabResultsLabResultId(props: {
  departmentHead: DepartmentheadPayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
  labResultId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformLabResult> {
  const { departmentHead, patientRecordId, encounterId, labResultId } = props;

  // Fetch lab result, join with encounter for access validation
  const labResult =
    await MyGlobal.prisma.healthcare_platform_lab_results.findFirst({
      where: { id: labResultId },
      include: { ehrEncounter: true },
    });
  if (!labResult) throw new Error("Lab result not found");
  if (!labResult.ehrEncounter)
    throw new Error("Lab result missing encounter linkage");
  if (labResult.ehrEncounter.id !== encounterId) {
    throw new Error("Lab result does not belong to the specified encounter");
  }
  if (labResult.ehrEncounter.patient_record_id !== patientRecordId) {
    throw new Error(
      "Lab result does not belong to the specified patient record",
    );
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
