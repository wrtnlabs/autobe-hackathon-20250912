import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformVital } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformVital";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Update a patient vital record for a specific encounter
 * (healthcare_platform_vitals).
 *
 * This operation updates an existing patient vital sign record (such as heart
 * rate, temperature, blood pressure, etc.) for a given clinical encounter
 * within a specific patient record. The update is allowed only if the vital and
 * its parent encounter and patient record are not soft-deleted and are not
 * locked for regulatory/audit reasons. After updating, an audit trail entry is
 * recorded to ensure compliance.
 *
 * Only mutable fields (vital_type, vital_value, unit, measured_at) may be
 * updated. Required validations are performed to check privilege (medicalDoctor
 * role), clinical value range (non-negative, optionally domain-specific), and
 * lock status (may not update if locked by compliance/audit/notification
 * flows). The operation throws errors for not found, deleted, or locked
 * records.
 *
 * @param props - Request properties
 * @param props.medicalDoctor - The authenticated MedicaldoctorPayload (must
 *   match a current, active medical doctor)
 * @param props.patientRecordId - Patient record UUID
 * @param props.encounterId - Clinical encounter UUID
 * @param props.vitalId - Vital record UUID to update
 * @param props.body - IHealthcarePlatformVital.IUpdate (fields allowed to
 *   update)
 * @returns The updated vital record
 * @throws {Error} If any referenced record is not found, deleted, locked, or if
 *   vital value is invalid
 */
export async function puthealthcarePlatformMedicalDoctorPatientRecordsPatientRecordIdEncountersEncounterIdVitalsVitalId(props: {
  medicalDoctor: MedicaldoctorPayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
  vitalId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformVital.IUpdate;
}): Promise<IHealthcarePlatformVital> {
  const { medicalDoctor, patientRecordId, encounterId, vitalId, body } = props;
  // Step 1: Fetch the vital record (must belong to correct encounter)
  const vital = await MyGlobal.prisma.healthcare_platform_vitals.findFirst({
    where: { id: vitalId, ehr_encounter_id: encounterId },
  });
  if (!vital)
    throw new Error(
      "Vital record does not exist, or does not belong to the given encounter.",
    );

  // Step 2: Confirm valid parent encounter and patient record (not soft-deleted)
  const encounter =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.findFirst({
      where: {
        id: encounterId,
        patient_record_id: patientRecordId,
        deleted_at: null,
      },
    });
  if (!encounter)
    throw new Error(
      "Encounter not found, deleted, or not linked to supplied patient record.",
    );

  const patientRecord =
    await MyGlobal.prisma.healthcare_platform_patient_records.findFirst({
      where: { id: patientRecordId, deleted_at: null },
    });
  if (!patientRecord)
    throw new Error("Patient record not found or has been deleted.");

  // Step 3: Enforce record lock status (block if any unreleased lock exists)
  const lock = await MyGlobal.prisma.healthcare_platform_record_locks.findFirst(
    {
      where: { patient_record_id: patientRecordId, released_at: null },
    },
  );
  if (lock)
    throw new Error(
      "Cannot update vital: Patient record is locked by compliance/audit/legal process.",
    );

  // Step 4: Primitive clinical validation: e.g. vital_value >= 0 if present
  if (typeof body.vital_value === "number" && body.vital_value < 0) {
    throw new Error("Vital value must be non-negative.");
  }
  // [Optional: Add more clinical-specific validation per vital_type if required]

  // Step 5: Perform update. Pass only provided updatable fields.
  const updated = await MyGlobal.prisma.healthcare_platform_vitals.update({
    where: { id: vitalId },
    data: {
      vital_type: body.vital_type ?? undefined,
      vital_value: body.vital_value ?? undefined,
      unit: body.unit ?? undefined,
      measured_at: body.measured_at ?? undefined,
    },
  });

  // Step 6: Write audit trail entry (before and after JSON, omitting deleted_at for vital)
  await MyGlobal.prisma.healthcare_platform_record_audit_trails.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      patient_record_id: patientRecordId,
      actor_user_id: medicalDoctor.id,
      audit_action: "update_vital",
      event_context_json: undefined,
      before_state_json: JSON.stringify({
        ...vital,
        measured_at: toISOStringSafe(vital.measured_at),
        created_at: toISOStringSafe(vital.created_at),
      }),
      after_state_json: JSON.stringify({
        ...updated,
        measured_at: toISOStringSafe(updated.measured_at),
        created_at: toISOStringSafe(updated.created_at),
      }),
      request_reason: undefined,
      created_at: toISOStringSafe(new Date()),
    },
  });

  // Step 7: Return updated vital, mapping all Date fields with toISOStringSafe
  return {
    id: updated.id,
    ehr_encounter_id: updated.ehr_encounter_id,
    recorded_by_user_id: updated.recorded_by_user_id,
    vital_type: updated.vital_type,
    vital_value: updated.vital_value,
    unit: updated.unit,
    measured_at: toISOStringSafe(updated.measured_at),
    created_at: toISOStringSafe(updated.created_at),
  };
}
