import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Update details of an existing EHR encounter for a patient record.
 *
 * This endpoint allows an authorized medical doctor to update the details of a
 * specific EHR encounter for a given patient record, including encounter type,
 * status, timing, and notes. Only the assigned provider for the encounter is
 * authorized to perform updates. All business and regulatory checks are
 * enforced.
 *
 * On success, returns the updated EHR encounter object reflecting all
 * modifications.
 *
 * @param props - Object containing the authenticated medical doctor, patient
 *   record ID, encounter ID, and update body.
 * @param props.medicalDoctor - The authenticated MedicaldoctorPayload
 * @param props.patientRecordId - UUID of the patient record containing the
 *   encounter
 * @param props.encounterId - UUID of the EHR encounter to update
 * @param props.body - The amendments or updates to apply to the encounter
 * @returns The updated EHR encounter object with fresh state
 * @throws {Error} If the encounter is not found, deleted, or not assigned to
 *   this provider
 */
export async function puthealthcarePlatformMedicalDoctorPatientRecordsPatientRecordIdEncountersEncounterId(props: {
  medicalDoctor: MedicaldoctorPayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformEhrEncounter.IUpdate;
}): Promise<IHealthcarePlatformEhrEncounter> {
  const { medicalDoctor, patientRecordId, encounterId, body } = props;

  // 1. Fetch the encounter, ensure existence and not soft-deleted
  const encounter =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.findFirst({
      where: {
        id: encounterId,
        patient_record_id: patientRecordId,
        deleted_at: null,
      },
    });
  if (!encounter) {
    throw new Error("EHR encounter not found or deleted.");
  }

  // 2. RBAC: Only assigned provider can update
  if (encounter.provider_user_id !== medicalDoctor.id) {
    throw new Error(
      "Unauthorized: Only the assigned provider can update this encounter.",
    );
  }

  // 3. Perform update with provided fields and bump updated_at
  const updated =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.update({
      where: { id: encounterId },
      data: {
        encounter_type: body.encounter_type ?? undefined,
        encounter_start_at: body.encounter_start_at ?? undefined,
        // Nullable/optional:
        encounter_end_at:
          typeof body.encounter_end_at !== "undefined"
            ? body.encounter_end_at
            : undefined,
        status: body.status ?? undefined,
        notes: typeof body.notes !== "undefined" ? body.notes : undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  // 4. Return the updated record fields, proper type conformity
  return {
    id: updated.id,
    patient_record_id: updated.patient_record_id,
    provider_user_id: updated.provider_user_id,
    encounter_type: updated.encounter_type,
    encounter_start_at: toISOStringSafe(updated.encounter_start_at),
    encounter_end_at:
      typeof updated.encounter_end_at !== "undefined" &&
      updated.encounter_end_at !== null
        ? toISOStringSafe(updated.encounter_end_at)
        : undefined,
    status: updated.status,
    notes: typeof updated.notes !== "undefined" ? updated.notes : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      typeof updated.deleted_at !== "undefined" && updated.deleted_at !== null
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
