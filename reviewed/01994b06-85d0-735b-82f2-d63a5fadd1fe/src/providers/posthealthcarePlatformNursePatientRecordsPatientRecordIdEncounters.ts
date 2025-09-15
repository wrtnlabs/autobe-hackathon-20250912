import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import { NursePayload } from "../decorators/payload/NursePayload";

/**
 * Create a new EHR encounter for a specific patient record.
 *
 * This endpoint allows an authorized nurse to record a new clinical or
 * administrative encounter for a given patient. It inserts a new row into the
 * healthcare_platform_ehr_encounters table, assigning the correct patient
 * record and provider, encounter type and timing, and any initial clinical
 * notes.
 *
 * The operation enforces permission for nurse role (via decorator), verifies
 * that the referenced patient record exists, and sets all required and optional
 * fields according to schema and DTO. All creation attempts are logged and
 * timestamped. The response contains the full created encounter for downstream
 * workflow use.
 *
 * @param props - The operation props
 * @param props.nurse - Authenticated NursePayload representing the nurse
 *   performing the operation
 * @param props.patientRecordId - The patient record UUID to which the encounter
 *   will be attached
 * @param props.body - The creation payload for the EHR encounter
 * @returns The full newly-created EHR encounter record with all fields properly
 *   typed
 * @throws {Error} When the patient record does not exist
 */
export async function posthealthcarePlatformNursePatientRecordsPatientRecordIdEncounters(props: {
  nurse: NursePayload;
  patientRecordId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformEhrEncounter.ICreate;
}): Promise<IHealthcarePlatformEhrEncounter> {
  const { nurse, patientRecordId, body } = props;

  // Verify the patient record exists
  const patientRecord =
    await MyGlobal.prisma.healthcare_platform_patient_records.findFirst({
      where: {
        id: patientRecordId,
      },
    });
  if (!patientRecord) throw new Error("Patient record not found");

  // Use current time for created_at and updated_at
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Create the encounter
  const created =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.create({
      data: {
        id: v4(),
        patient_record_id: patientRecordId,
        provider_user_id: body.provider_user_id,
        encounter_type: body.encounter_type,
        encounter_start_at: body.encounter_start_at,
        encounter_end_at: body.encounter_end_at ?? null,
        status: body.status,
        notes: body.notes ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  return {
    id: created.id,
    patient_record_id: created.patient_record_id,
    provider_user_id: created.provider_user_id,
    encounter_type: created.encounter_type,
    encounter_start_at: toISOStringSafe(created.encounter_start_at),
    encounter_end_at:
      created.encounter_end_at != null
        ? toISOStringSafe(created.encounter_end_at)
        : null,
    status: created.status,
    notes: created.notes ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at != null ? toISOStringSafe(created.deleted_at) : null,
  };
}
