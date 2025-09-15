import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformVital } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformVital";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Retrieve a specific patient vital entry for an encounter
 * (healthcare_platform_vitals)
 *
 * This operation retrieves the details for a single vital sign record by its
 * unique identifier for a patient encounter within an organization. It performs
 * strict scope and authorization checks:
 *
 * - Ensures the vital record exists
 * - Ensures the vital's encounter exists and matches both the requested encounter
 *   and patient record
 * - Verifies that the requesting medical doctor is the provider assigned to the
 *   encounter
 *
 * If all checks pass, returns the complete vital record with all required
 * fields. All date/datetime values are returned as branded ISO 8601 strings. No
 * type assertions are used.
 *
 * @param props - Request properties
 * @param props.medicalDoctor - The authenticated medical doctor making the
 *   request
 * @param props.patientRecordId - Target patient record's unique identifier
 *   (UUID)
 * @param props.encounterId - EHR encounter's unique identifier (UUID)
 * @param props.vitalId - Unique identifier for the vital entry (UUID)
 * @returns The detailed vital sign entity for review
 * @throws {Error} When the vital does not exist
 * @throws {Error} When the encounter does not exist, or is not linked to the
 *   patient/encounter/vital chain
 * @throws {Error} When the requesting doctor lacks necessary access scope
 */
export async function gethealthcarePlatformMedicalDoctorPatientRecordsPatientRecordIdEncountersEncounterIdVitalsVitalId(props: {
  medicalDoctor: MedicaldoctorPayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
  vitalId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformVital> {
  const { medicalDoctor, patientRecordId, encounterId, vitalId } = props;

  // 1. Fetch vital by vitalId
  const vital = await MyGlobal.prisma.healthcare_platform_vitals.findUnique({
    where: { id: vitalId },
  });
  if (!vital) {
    throw new Error("Vital not found");
  }

  // 2. Fetch encounter and validate chain (vital.ehr_encounter_id === encounterId, encounter.patient_record_id === patientRecordId)
  const encounter =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.findUnique({
      where: { id: vital.ehr_encounter_id },
    });
  if (!encounter) {
    throw new Error("Encounter not found");
  }
  if (encounter.id !== encounterId) {
    throw new Error("Vital does not belong to the provided encounter");
  }
  if (encounter.patient_record_id !== patientRecordId) {
    throw new Error("Encounter does not belong to the provided patient record");
  }
  // 3. Scope restriction: doctor must be provider for the encounter
  if (encounter.provider_user_id !== medicalDoctor.id) {
    throw new Error(
      "Forbidden: Medical doctor does not have access to this encounter/vital",
    );
  }

  // 4. Return vital record, mapping all required fields and converting dates to branded string
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
