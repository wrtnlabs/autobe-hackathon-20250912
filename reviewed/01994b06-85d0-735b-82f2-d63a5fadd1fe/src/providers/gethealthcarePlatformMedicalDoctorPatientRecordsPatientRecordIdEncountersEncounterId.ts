import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Retrieve detailed information about a specific patient encounter by ID.
 *
 * This operation retrieves the full details of a specific clinical or
 * administrative encounter for a patient, querying the
 * healthcare_platform_ehr_encounters table and associated data for the supplied
 * patientRecordId and encounterId. Used to view metadata, provider assignments,
 * notes, types, and audit references as required by clinical workflows.
 *
 * Only the medical doctor assigned as provider may access this record. If not
 * found, throws an error. Throws forbidden if the authenticated doctor does not
 * match the encounter provider.
 *
 * @param props - Request properties
 * @param props.medicalDoctor - The authenticated medical doctor (payload)
 * @param props.patientRecordId - Unique ID of the patient record containing the
 *   encounter
 * @param props.encounterId - Unique ID of the EHR encounter to retrieve
 * @returns Complete details of the requested EHR encounter
 * @throws {Error} When no such encounter exists, or doctor is unassigned
 */
export async function gethealthcarePlatformMedicalDoctorPatientRecordsPatientRecordIdEncountersEncounterId(props: {
  medicalDoctor: MedicaldoctorPayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformEhrEncounter> {
  const { medicalDoctor, patientRecordId, encounterId } = props;

  // Fetch encounter by both IDs; if not found, fail (404)
  const encounter =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.findFirst({
      where: {
        id: encounterId,
        patient_record_id: patientRecordId,
      },
    });
  if (!encounter) throw new Error("Encounter not found");

  // Authorization: only the assigned doctor can view
  if (encounter.provider_user_id !== medicalDoctor.id)
    throw new Error("Forbidden");

  // Build response mapping all fields, handling branding, and nullables
  return {
    id: encounter.id,
    patient_record_id: encounter.patient_record_id,
    provider_user_id: encounter.provider_user_id,
    encounter_type: encounter.encounter_type,
    encounter_start_at: toISOStringSafe(encounter.encounter_start_at),
    encounter_end_at: encounter.encounter_end_at
      ? toISOStringSafe(encounter.encounter_end_at)
      : undefined,
    status: encounter.status,
    notes: encounter.notes ?? undefined,
    created_at: toISOStringSafe(encounter.created_at),
    updated_at: toISOStringSafe(encounter.updated_at),
    deleted_at: encounter.deleted_at
      ? toISOStringSafe(encounter.deleted_at)
      : undefined,
  };
}
