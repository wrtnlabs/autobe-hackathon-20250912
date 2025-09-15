import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import { NursePayload } from "../decorators/payload/NursePayload";

/**
 * Update details of an existing EHR encounter for a patient record.
 *
 * This endpoint allows a nurse to amend fields (encounter type, timing, status,
 * or notes) of an existing clinical or administrative EHR encounter for a
 * specific patient record and encounter ID, enforcing RBAC and business policy
 * (locked/completed encounter cannot be changed; only author may update). All
 * updates trigger audit/versioning (via updated_at); errors raised for
 * ownership/business rule violations.
 *
 * @param props - Contains nurse auth payload, patientRecordId, encounterId, and
 *   update body
 * @param props.nurse - Authenticated NursePayload for the requesting nurse
 * @param props.patientRecordId - Patient record UUID that must match the
 *   encounter
 * @param props.encounterId - EHR encounter UUID to update
 * @param props.body - Encounter update payload with permitted updatable fields
 * @returns An updated IHealthcarePlatformEhrEncounter with all properties in
 *   API contract shape
 * @throws {Error} If the encounter does not exist, is soft-deleted, owned by
 *   another provider, or is locked/completed
 */
export async function puthealthcarePlatformNursePatientRecordsPatientRecordIdEncountersEncounterId(props: {
  nurse: NursePayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformEhrEncounter.IUpdate;
}): Promise<IHealthcarePlatformEhrEncounter> {
  const { nurse, patientRecordId, encounterId, body } = props;

  // Step 1: Fetch the encounter and check for presence, correct patient, and not soft-deleted
  const encounter =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.findFirst({
      where: {
        id: encounterId,
        patient_record_id: patientRecordId,
        deleted_at: null,
      },
    });
  if (!encounter) {
    throw new Error("Encounter record not found");
  }

  // Step 2: Authorization - must be author/assigned nurse (provider_user_id matches nurse.id)
  if (encounter.provider_user_id !== nurse.id) {
    throw new Error("You are not permitted to update this encounter");
  }

  // Step 3: Business logic - encounter is locked by workflow status
  if (encounter.status === "completed" || encounter.status === "in_review") {
    throw new Error("This encounter is locked and cannot be updated");
  }

  // Step 4: Prepare update fields, only set values that are defined in body
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.update({
      where: { id: encounterId },
      data: {
        ...(body.encounter_type !== undefined && {
          encounter_type: body.encounter_type,
        }),
        ...(body.encounter_start_at !== undefined && {
          encounter_start_at: body.encounter_start_at,
        }),
        ...(body.encounter_end_at !== undefined && {
          encounter_end_at: body.encounter_end_at,
        }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.notes !== undefined && { notes: body.notes }),
        updated_at: now,
      },
    });

  // Step 5: Return all required fields, normalizing datetimes and undefined/nulls
  return {
    id: updated.id,
    patient_record_id: updated.patient_record_id,
    provider_user_id: updated.provider_user_id,
    encounter_type: updated.encounter_type,
    encounter_start_at: toISOStringSafe(updated.encounter_start_at),
    encounter_end_at:
      updated.encounter_end_at === null ||
      updated.encounter_end_at === undefined
        ? undefined
        : toISOStringSafe(updated.encounter_end_at),
    status: updated.status,
    notes:
      updated.notes === null || updated.notes === undefined
        ? undefined
        : updated.notes,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null || updated.deleted_at === undefined
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
