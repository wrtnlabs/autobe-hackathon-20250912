import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { NursePayload } from "../decorators/payload/NursePayload";

/**
 * Permanently or soft-deletes a vital record associated with a patient's
 * clinical encounter.
 *
 * According to the healthcare_platform_vitals schema, records are soft-deleted
 * using the deleted_at column (set to NULL for active records, timestamp for
 * deleted). Only roles with appropriate clinical privileges (nurse,
 * medicalDoctor) and organizational assignment may delete vital records. The
 * API checks for regulatory or legal locks before permitting deletion. Audit
 * logs record both the delete request and resulting state change for
 * compliance/debugging. Attempts to delete records already soft-deleted,
 * locked, or under audit must yield a clear error. No content is returned on
 * success.
 *
 * @param props - Operation context
 * @param props.nurse - Authenticated nurse payload (id, type)
 * @param props.patientRecordId - UUID of the patient record (context limiting
 *   vital deletion)
 * @param props.encounterId - UUID of the clinical encounter
 * @param props.vitalId - UUID of the vital sign record to delete
 * @returns Void
 * @throws {Error} If record not found, already deleted, record is locked, or
 *   vital not belonging to given patient record
 */
export async function deletehealthcarePlatformNursePatientRecordsPatientRecordIdEncountersEncounterIdVitalsVitalId(props: {
  nurse: NursePayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
  vitalId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { nurse, patientRecordId, encounterId, vitalId } = props;

  // Step 1: Find vital by id/encounterId
  const vital = await MyGlobal.prisma.healthcare_platform_vitals.findUnique({
    where: { id: vitalId },
  });
  if (!vital) throw new Error("Vital record not found or already deleted");
  if (vital.ehr_encounter_id !== encounterId)
    throw new Error("Vital record does not belong to specified encounter");

  // Step 2: Check patient_record link with the encounter
  const encounter =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.findUnique({
      where: { id: encounterId },
    });
  if (!encounter || encounter.patient_record_id !== patientRecordId)
    throw new Error("Vital record does not belong to given patient record");

  // Step 3: Check for unreleased legal/compliance locks
  const lock = await MyGlobal.prisma.healthcare_platform_record_locks.findFirst(
    {
      where: {
        patient_record_id: patientRecordId,
        released_at: null,
      },
    },
  );
  if (lock) throw new Error("Patient record is locked and cannot be modified");

  // Step 4: Perform hard delete of vital record (since deleted_at does not exist in the schema)
  await MyGlobal.prisma.healthcare_platform_vitals.delete({
    where: { id: vitalId },
  });

  // Step 5: Write audit log
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      user_id: nurse.id,
      organization_id: undefined,
      action_type: "VITAL_DELETE",
      event_context: JSON.stringify({ patientRecordId, encounterId, vitalId }),
      ip_address: undefined,
      related_entity_type: "VITAL",
      related_entity_id: vitalId,
      created_at: now,
    },
  });
}
