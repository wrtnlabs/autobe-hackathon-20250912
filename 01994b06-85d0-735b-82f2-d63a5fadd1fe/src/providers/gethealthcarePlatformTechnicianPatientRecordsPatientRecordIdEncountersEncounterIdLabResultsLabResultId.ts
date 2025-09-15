import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformLabResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabResult";
import { TechnicianPayload } from "../decorators/payload/TechnicianPayload";

/**
 * Retrieve a detailed laboratory result by ID for a given patient record and
 * encounter
 *
 * This API operation fetches a specific laboratory result from the
 * healthcare_platform_lab_results table, uniquely identified by labResultId,
 * for the given EHR encounter and patient record. It ensures the result is
 * correctly linked through the encounter and patient ownership, enforcing
 * strict clinical data isolation and scoping for compliance.
 *
 * Authorization: Only authenticated technicians may access this endpoint.
 * Additional RBAC/scoping can be layered above. Throws when not found or not
 * accessible for the given patient/encounter.
 *
 * @param props - The request context and path parameters
 * @param props.technician - The authenticated technician (must have valid id
 *   and role)
 * @param props.patientRecordId - The parent patient record UUID
 * @param props.encounterId - The parent EHR encounter UUID
 * @param props.labResultId - The specific laboratory result UUID
 * @returns The full detail of the laboratory result, matching
 *   IHealthcarePlatformLabResult
 * @throws {Error} If the lab result does not exist for the specified
 *   patient/encounter or access denied
 */
export async function gethealthcarePlatformTechnicianPatientRecordsPatientRecordIdEncountersEncounterIdLabResultsLabResultId(props: {
  technician: TechnicianPayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
  labResultId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformLabResult> {
  const { technician, patientRecordId, encounterId, labResultId } = props;
  const labResult =
    await MyGlobal.prisma.healthcare_platform_lab_results.findFirst({
      where: {
        id: labResultId,
        ehr_encounter_id: encounterId,
      },
      include: {
        ehrEncounter: true,
      },
    });
  if (
    !labResult ||
    !labResult.ehrEncounter ||
    labResult.ehrEncounter.patient_record_id !== patientRecordId
  ) {
    throw new Error(
      "Lab result not found or does not correspond to the specified patient record and encounter.",
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
