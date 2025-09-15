import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformVital } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformVital";
import { NursePayload } from "../decorators/payload/NursePayload";

/**
 * Update a patient vital record for a specific encounter
 * (healthcare_platform_vitals).
 *
 * This operation updates an existing patient vital measurement record,
 * performing all required soft delete, legal hold, and context checks. The
 * vital is associated with the given clinical encounter and patient record.
 * Only allowed fields may be updated; id, FKs, audit fields are immutable. Any
 * attempted update to a record that is soft-deleted or under active regulatory
 * lock results in an error. Every successful update is fully audited with full
 * before/after snapshots. Returns the fully-typed updated vital record.
 *
 * @param props - Request properties
 * @param props.nurse - The authenticated nurse performing the update
 * @param props.patientRecordId - Patient record id (UUID)
 * @param props.encounterId - Encounter id (UUID)
 * @param props.vitalId - Vital sign id (UUID)
 * @param props.body - Fields to update (type, value, unit, measured_at)
 * @returns The updated vital record, fully typed
 * @throws {Error} When vital, encounter, or patient record is not found
 * @throws {Error} When authorization/context checks fail
 * @throws {Error} When any related record is soft-deleted
 * @throws {Error} When legal/audit lock is present
 */
export async function puthealthcarePlatformNursePatientRecordsPatientRecordIdEncountersEncounterIdVitalsVitalId(props: {
  nurse: NursePayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
  vitalId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformVital.IUpdate;
}): Promise<IHealthcarePlatformVital> {
  const { nurse, patientRecordId, encounterId, vitalId, body } = props;
  // Fetch the vital record for deleted check and before/after state
  const vital = await MyGlobal.prisma.healthcare_platform_vitals.findUnique({
    where: { id: vitalId },
    select: {
      id: true,
      ehr_encounter_id: true,
      recorded_by_user_id: true,
      vital_type: true,
      vital_value: true,
      unit: true,
      measured_at: true,
      created_at: true,
    },
  });
  // Check if vital is soft deleted by fetching only deleted_at separately
  const vitalDeletedRaw =
    await MyGlobal.prisma.healthcare_platform_vitals.findUnique({
      where: { id: vitalId },
      select: { deleted_at: true }, // deleted_at checked separately
    });
  if (!vital || !vitalDeletedRaw)
    throw new Error("Vital sign record not found");
  if (
    vitalDeletedRaw.deleted_at !== null &&
    vitalDeletedRaw.deleted_at !== undefined
  ) {
    throw new Error("Vital has been deleted (soft-delete)");
  }
  if (vital.ehr_encounter_id !== encounterId)
    throw new Error("Mismatch: vital does not belong to given encounter");

  const encounter =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.findUnique({
      where: { id: encounterId },
      select: {
        id: true,
        patient_record_id: true,
        deleted_at: true,
      },
    });
  if (!encounter) throw new Error("Encounter not found");
  if (encounter.deleted_at !== null && encounter.deleted_at !== undefined) {
    throw new Error("Encounter has been deleted (soft-delete)");
  }
  if (encounter.patient_record_id !== patientRecordId)
    throw new Error("Mismatch: encounter does not belong to patient record");

  const record =
    await MyGlobal.prisma.healthcare_platform_patient_records.findUnique({
      where: { id: patientRecordId },
      select: {
        id: true,
        deleted_at: true,
      },
    });
  if (!record) throw new Error("Patient record not found");
  if (record.deleted_at !== null && record.deleted_at !== undefined) {
    throw new Error("Patient record has been deleted (soft-delete)");
  }

  // Regulatory hold/lock check on patient record
  const lock = await MyGlobal.prisma.healthcare_platform_record_locks.findFirst(
    {
      where: { patient_record_id: patientRecordId, released_at: null },
    },
  );
  if (lock) throw new Error("Patient record is under legal hold or audit lock");

  // Prepare before state for audit
  const before = {
    id: vital.id,
    ehr_encounter_id: vital.ehr_encounter_id,
    recorded_by_user_id: vital.recorded_by_user_id,
    vital_type: vital.vital_type,
    vital_value: vital.vital_value,
    unit: vital.unit,
    measured_at: toISOStringSafe(vital.measured_at),
    created_at: toISOStringSafe(vital.created_at),
  };

  // Build update data
  const updates: IHealthcarePlatformVital.IUpdate = {};
  if (body.vital_type !== undefined) updates.vital_type = body.vital_type;
  if (body.vital_value !== undefined) updates.vital_value = body.vital_value;
  if (body.unit !== undefined) updates.unit = body.unit;
  if (body.measured_at !== undefined) updates.measured_at = body.measured_at;

  // Update and select all DTO fields
  const updated = await MyGlobal.prisma.healthcare_platform_vitals.update({
    where: { id: vitalId },
    data: updates,
    select: {
      id: true,
      ehr_encounter_id: true,
      recorded_by_user_id: true,
      vital_type: true,
      vital_value: true,
      unit: true,
      measured_at: true,
      created_at: true,
    },
  });

  // Compose after state for audit
  const after = {
    id: updated.id,
    ehr_encounter_id: updated.ehr_encounter_id,
    recorded_by_user_id: updated.recorded_by_user_id,
    vital_type: updated.vital_type,
    vital_value: updated.vital_value,
    unit: updated.unit,
    measured_at: toISOStringSafe(updated.measured_at),
    created_at: toISOStringSafe(updated.created_at),
  };

  // Record the audit log
  await MyGlobal.prisma.healthcare_platform_record_audit_trails.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      patient_record_id: patientRecordId,
      actor_user_id: nurse.id,
      audit_action: "update",
      event_context_json: null,
      before_state_json: JSON.stringify(before),
      after_state_json: JSON.stringify(after),
      request_reason: null,
      created_at: toISOStringSafe(new Date()),
    },
  });

  // Return the updated vital, converting all dates to branded ISO strings
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
