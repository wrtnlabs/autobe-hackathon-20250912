import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Delete (hard, not soft) a vital sign record under a patient encounter
 * (healthcare_platform_vitals).
 *
 * This operation hard-deletes the vital record since 'deleted_at' does not
 * exist in the schema. All RBAC, lock, and audit rules are still enforced.
 *
 * @param props - Destructured properties including:
 *
 *   - MedicalDoctor: Authenticated MedicaldoctorPayload
 *   - PatientRecordId: UUID of patient record
 *   - EncounterId: UUID of parent clinical encounter
 *   - VitalId: UUID of the vital sign record to delete
 *
 * @returns Void
 * @throws {Error} When the vital record does not exist, record is locked, or
 *   RBAC is violated.
 */
export async function deletehealthcarePlatformMedicalDoctorPatientRecordsPatientRecordIdEncountersEncounterIdVitalsVitalId(props: {
  medicalDoctor: MedicaldoctorPayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
  vitalId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { medicalDoctor, patientRecordId, encounterId, vitalId } = props;

  // Step 1: Fetch vital record (must exist and match encounter)
  const vital = await MyGlobal.prisma.healthcare_platform_vitals.findFirst({
    where: {
      id: vitalId,
      ehr_encounter_id: encounterId,
    },
  });
  if (!vital) {
    throw new Error("Vital record not found");
  }

  // Step 2: Validate encounter-patient association
  const encounter =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.findFirst({
      where: {
        id: encounterId,
      },
    });
  if (!encounter || encounter.patient_record_id !== patientRecordId) {
    throw new Error("Encounter does not match patient record");
  }

  // Step 3: Check for record locks
  const activeLock =
    await MyGlobal.prisma.healthcare_platform_record_locks.findFirst({
      where: {
        patient_record_id: patientRecordId,
        released_at: null,
      },
    });
  if (activeLock) {
    throw new Error("Patient record is locked and vitals cannot be deleted");
  }

  // Step 4: Hard-delete vital record
  await MyGlobal.prisma.healthcare_platform_vitals.delete({
    where: { id: vitalId },
  });

  // Step 5: Audit trail log (compliance)
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.healthcare_platform_record_audit_trails.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      patient_record_id: patientRecordId,
      actor_user_id: medicalDoctor.id,
      audit_action: "delete",
      event_context_json: JSON.stringify({
        vital_id: vitalId,
        action: "hard_delete",
        deleter_type: medicalDoctor.type,
      }),
      before_state_json: JSON.stringify(vital),
      after_state_json: null,
      request_reason: null,
      created_at: now,
    },
  });
}
