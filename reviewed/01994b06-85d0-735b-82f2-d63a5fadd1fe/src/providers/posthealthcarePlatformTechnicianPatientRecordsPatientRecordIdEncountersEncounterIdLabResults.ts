import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformLabResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabResult";
import { TechnicianPayload } from "../decorators/payload/TechnicianPayload";

/**
 * Create a new laboratory result for a specific encounter and patient record
 *
 * This endpoint creates a lab result record in the
 * healthcare_platform_lab_results table, storing metadata and full test values
 * for a specified encounter and patient. It enforces that the encounter belongs
 * to the provided patient record, that the referenced lab integration is
 * active, and all linkage and field integrity is correct. Only authenticated
 * technicians are authorized, and all date fields use strict ISO8601
 * formatting. Errors are thrown if any references are invalid or business
 * constraints are violated.
 *
 * @param props - Request object containing authentication, path params, and
 *   body
 * @param props.technician - Authenticated technician user context
 * @param props.patientRecordId - UUID of the patient record to attach the lab
 *   result to
 * @param props.encounterId - UUID of the encounter to attach the lab result to
 * @param props.body - New lab result object with all fields required except id
 *   and created_at
 * @returns New laboratory result record including test, linkage and metadata,
 *   as IHealthcarePlatformLabResult
 * @throws {Error} If referenced encounter does not exist or is not linked to
 *   patient record
 * @throws {Error} If the target lab integration does not exist or is not active
 */
export async function posthealthcarePlatformTechnicianPatientRecordsPatientRecordIdEncountersEncounterIdLabResults(props: {
  technician: TechnicianPayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformLabResult.ICreate;
}): Promise<IHealthcarePlatformLabResult> {
  const { technician, patientRecordId, encounterId, body } = props;

  // Ensure the encounter exists and matches the specified patient record
  const encounter =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.findFirst({
      where: {
        id: encounterId,
        patient_record_id: patientRecordId,
        deleted_at: null,
      },
    });
  if (!encounter) {
    throw new Error(
      "Encounter not found for provided patientRecordId or has been deleted",
    );
  }

  // Ensure the lab integration exists and is active
  const labIntegration =
    await MyGlobal.prisma.healthcare_platform_lab_integrations.findFirst({
      where: {
        id: body.lab_integration_id,
        status: "active",
        deleted_at: null,
      },
    });
  if (!labIntegration) {
    throw new Error("Lab integration not found or is not active");
  }

  const id = v4() as string & tags.Format<"uuid">;
  const created_at = toISOStringSafe(new Date());

  await MyGlobal.prisma.healthcare_platform_lab_results.create({
    data: {
      id,
      ehr_encounter_id: encounterId,
      lab_integration_id: body.lab_integration_id,
      test_name: body.test_name,
      test_result_value_json: body.test_result_value_json,
      result_flag: body.result_flag,
      resulted_at: body.resulted_at,
      status: body.status,
      created_at,
    },
  });

  return {
    id,
    ehr_encounter_id: encounterId,
    lab_integration_id: body.lab_integration_id,
    test_name: body.test_name,
    test_result_value_json: body.test_result_value_json,
    result_flag: body.result_flag,
    resulted_at: body.resulted_at,
    status: body.status,
    created_at,
  };
}
