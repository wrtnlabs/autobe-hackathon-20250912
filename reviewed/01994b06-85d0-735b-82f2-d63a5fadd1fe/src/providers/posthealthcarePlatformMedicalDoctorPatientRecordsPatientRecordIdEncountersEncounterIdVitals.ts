import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformVital } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformVital";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Create a new patient vital sign entry for an encounter
 * (healthcare_platform_vitals)
 *
 * Creates a new vital sign entry (e.g., heart rate, respiratory rate, blood
 * pressure, temperature) for a patient as part of a specific EHR encounter.
 * Only allowed for nurses, doctors, or department heads, but this function is
 * scoped for medicalDoctor role. Ensures the authenticated medical doctor is
 * actually assigned to the encounter as provider. All create actions are
 * PHI-audited; returns new vital entry.
 *
 * @param props.medicalDoctor - The authenticated medical doctor user (payload)
 * @param props.patientRecordId - UUID of the patient record (must match
 *   encounter's patient)
 * @param props.encounterId - UUID of the EHR encounter to which the vitals are
 *   being added
 * @param props.body - The vital entry to record (type, value, unit, time, and
 *   EHR encounter reference)
 * @returns The newly created vital entry with attribution/metadata
 * @throws {Error} If the encounter does not exist, does not belong to the
 *   patient, or the doctor is not assigned
 * @throws {Error} If the body.ehr_encounter_id does not match the requested
 *   encounter ID
 */
export async function posthealthcarePlatformMedicalDoctorPatientRecordsPatientRecordIdEncountersEncounterIdVitals(props: {
  medicalDoctor: MedicaldoctorPayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformVital.ICreate;
}): Promise<IHealthcarePlatformVital> {
  const { medicalDoctor, patientRecordId, encounterId, body } = props;

  // Find the encounter and ensure it matches the patient and exists
  const encounter =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.findFirst({
      where: {
        id: encounterId,
        patient_record_id: patientRecordId,
      },
    });
  if (!encounter) {
    throw new Error("Encounter not found or not accessible for this patient");
  }

  // Only allow the doctor if they are assigned to the encounter as provider
  if (encounter.provider_user_id !== medicalDoctor.id) {
    throw new Error("Doctor is not assigned to this encounter");
  }

  // Check body.ehr_encounter_id matches
  if (body.ehr_encounter_id !== encounterId) {
    throw new Error(
      "Body encounter id does not match the URL path encounterId",
    );
  }

  // Insert new vital record
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.healthcare_platform_vitals.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      ehr_encounter_id: encounterId,
      recorded_by_user_id: medicalDoctor.id,
      vital_type: body.vital_type,
      vital_value: body.vital_value,
      unit: body.unit,
      measured_at: body.measured_at,
      created_at: now,
    },
  });

  // Return fully populated vital entry in correct structure (all fields required)
  return {
    id: created.id,
    ehr_encounter_id: created.ehr_encounter_id,
    recorded_by_user_id: created.recorded_by_user_id,
    vital_type: created.vital_type,
    vital_value: created.vital_value,
    unit: created.unit,
    measured_at: created.measured_at,
    created_at: created.created_at,
  };
}
