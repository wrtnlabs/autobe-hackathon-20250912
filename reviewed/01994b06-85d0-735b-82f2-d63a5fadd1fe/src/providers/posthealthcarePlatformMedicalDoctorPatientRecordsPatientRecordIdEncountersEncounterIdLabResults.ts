import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformLabResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabResult";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Create a new laboratory result for a specific encounter and patient record
 *
 * This endpoint enables authorized clinical or technical users (such as medical
 * doctors) to create a new lab result for a specific patient record and EHR
 * encounter within the healthcarePlatform system. The API strictly validates
 * the encounter-patient linkage, ensures lab integration is active, and
 * enforces data integrity. All fields, including test details, result flags,
 * and linkage to the lab provider, are stored as permanent clinical records.
 * Audit and compliance workflows are triggered for traceability and legal
 * requirements.
 *
 * @param props - Operation parameters and authentication context
 * @param props.medicalDoctor - Authenticated medical doctor performing the
 *   operation
 * @param props.patientRecordId - Unique identifier of patient record to which
 *   the encounter and new result must belong
 * @param props.encounterId - Unique identifier of the EHR encounter for which
 *   the lab result is recorded
 * @param props.body - Lab result creation payload (test details, result values,
 *   flags, provider, metadata)
 * @returns The complete laboratory result record as created, including
 *   system-assigned ID and metadata
 * @throws {Error} When the encounter or lab integration does not exist, link to
 *   patient record fails, or resource is inactive
 */
export async function posthealthcarePlatformMedicalDoctorPatientRecordsPatientRecordIdEncountersEncounterIdLabResults(props: {
  medicalDoctor: MedicaldoctorPayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformLabResult.ICreate;
}): Promise<IHealthcarePlatformLabResult> {
  // Step 1: Validate encounter exists, belongs to correct patient, and is not deleted
  const encounter =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.findFirst({
      where: {
        id: props.encounterId,
        patient_record_id: props.patientRecordId,
        deleted_at: null,
      },
    });
  if (!encounter) {
    throw new Error(
      "Encounter not found, inactive, or not part of specified patient record.",
    );
  }

  // Step 2: Validate referenced lab integration is active and not deleted
  const labIntegration =
    await MyGlobal.prisma.healthcare_platform_lab_integrations.findFirst({
      where: {
        id: props.body.lab_integration_id,
        status: "active",
        deleted_at: null,
      },
    });
  if (!labIntegration) {
    throw new Error("Lab integration provider not found or not active.");
  }

  // Step 3: Create new lab result row with system-assigned id and created_at
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.healthcare_platform_lab_results.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      ehr_encounter_id: props.encounterId,
      lab_integration_id: props.body.lab_integration_id,
      test_name: props.body.test_name,
      test_result_value_json: props.body.test_result_value_json,
      result_flag: props.body.result_flag,
      resulted_at: props.body.resulted_at,
      status: props.body.status,
      created_at: now,
    },
  });

  // Step 4: Return the entity, ensuring all fields strictly conform
  return {
    id: created.id,
    ehr_encounter_id: created.ehr_encounter_id,
    lab_integration_id: created.lab_integration_id,
    test_name: created.test_name,
    test_result_value_json: created.test_result_value_json,
    result_flag: created.result_flag,
    resulted_at: created.resulted_at,
    status: created.status,
    created_at: created.created_at,
  };
}
