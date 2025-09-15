import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import { NursePayload } from "../decorators/payload/NursePayload";

/**
 * Retrieve detailed information about a specific patient encounter by ID.
 *
 * This endpoint allows an authorized nurse to access the complete details for a
 * single EHR encounter belonging to a patient record. It looks up the encounter
 * by both patient record ID and encounter ID, ensuring the record is not
 * soft-deleted. All metadata fields, timestamps, status, notes, and provider
 * assignments are returned strictly matching the DTO contract.
 *
 * @param props - Object containing all necessary parameters for the operation
 * @param props.nurse - The authenticated nurse accessing the encounter
 * @param props.patientRecordId - The UUID of the patient record containing the
 *   encounter
 * @param props.encounterId - The UUID of the EHR encounter to retrieve
 * @returns Detailed encounter data for the specified patient record and
 *   encounter ID
 * @throws {Error} When no matching encounter is found, or if the encounter is
 *   soft-deleted
 */
export async function gethealthcarePlatformNursePatientRecordsPatientRecordIdEncountersEncounterId(props: {
  nurse: NursePayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformEhrEncounter> {
  const { nurse, patientRecordId, encounterId } = props;

  const encounter =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.findFirst({
      where: {
        id: encounterId,
        patient_record_id: patientRecordId,
        deleted_at: null,
      },
    });
  if (!encounter) {
    throw new Error("Encounter not found");
  }
  return {
    id: encounter.id,
    patient_record_id: encounter.patient_record_id,
    provider_user_id: encounter.provider_user_id,
    encounter_type: encounter.encounter_type,
    encounter_start_at: toISOStringSafe(encounter.encounter_start_at),
    // encounter_end_at is optional/nullable in DTO, so map as null if missing else convert
    encounter_end_at: encounter.encounter_end_at
      ? toISOStringSafe(encounter.encounter_end_at)
      : null,
    status: encounter.status,
    notes: encounter.notes ?? undefined,
    created_at: toISOStringSafe(encounter.created_at),
    updated_at: toISOStringSafe(encounter.updated_at),
    // deleted_at is optional/nullable. It will always be null due to query, but preserve type
    deleted_at: encounter.deleted_at
      ? toISOStringSafe(encounter.deleted_at)
      : undefined,
  };
}
