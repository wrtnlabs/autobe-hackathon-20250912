import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformVital } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformVital";
import { NursePayload } from "../decorators/payload/NursePayload";

/**
 * Retrieve a specific patient vital entry for an encounter
 * (healthcare_platform_vitals)
 *
 * Retrieves the detailed information for a single vital sign entry by its
 * unique identifier, as recorded during a specified patient encounter for a
 * particular patient record. This endpoint enforces a contextual check across
 * vital, encounter, and patient record hierarchy, and ensures full compliance
 * with authorization requirements. If the vital entry does not exist, or if it
 * is not associated with the specified encounter or patient record, an error is
 * thrown. Date fields are always returned as ISO 8601 branded strings. Soft
 * deletions (deleted_at) are checked for the chain. Nurse authentication
 * context must be present.
 *
 * @param props - The context object for this request
 * @param props.nurse - Authenticated NursePayload object (from NurseAuth
 *   decorator)
 * @param props.patientRecordId - Target patient record UUID
 * @param props.encounterId - Target EHR encounter UUID
 * @param props.vitalId - Target vital entry UUID
 * @returns The IHealthcarePlatformVital object for the given vitalId
 * @throws {Error} If the vital record is not found, not associated correctly,
 *   or if parent context is soft-deleted
 */
export async function gethealthcarePlatformNursePatientRecordsPatientRecordIdEncountersEncounterIdVitalsVitalId(props: {
  nurse: NursePayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
  vitalId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformVital> {
  const { nurse, patientRecordId, encounterId, vitalId } = props;

  // Step 1: Fetch the vital record
  const vital = await MyGlobal.prisma.healthcare_platform_vitals.findFirst({
    where: { id: vitalId },
  });
  if (!vital) throw new Error("Not found");

  // Step 2: Fetch and validate encounter context
  const encounter =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.findFirst({
      where: {
        id: vital.ehr_encounter_id,
      },
    });
  if (!encounter) throw new Error("Not found");
  // Check encounterId and match with patientRecordId, and validate not soft-deleted
  if (
    encounter.id !== encounterId ||
    encounter.patient_record_id !== patientRecordId ||
    encounter.deleted_at !== null
  ) {
    throw new Error("Not found");
  }

  // Step 3: Check patient record context and not soft-deleted
  const patientRecord =
    await MyGlobal.prisma.healthcare_platform_patient_records.findFirst({
      where: {
        id: patientRecordId,
        deleted_at: null,
      },
    });
  if (!patientRecord) throw new Error("Not found");

  // Compose DTO: all date fields use toISOStringSafe, do not use Date type, do not use as
  return {
    id: vital.id,
    ehr_encounter_id: vital.ehr_encounter_id,
    recorded_by_user_id: vital.recorded_by_user_id,
    vital_type: vital.vital_type,
    vital_value: vital.vital_value,
    unit: vital.unit,
    measured_at: toISOStringSafe(vital.measured_at),
    created_at: toISOStringSafe(vital.created_at),
  };
}
