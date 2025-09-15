import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Create a new EHR encounter for a specific patient record.
 *
 * This operation creates a new clinical or administrative EHR encounter for a
 * given patient record in the healthcarePlatform system. Only the authenticated
 * medical doctor (provider) can create the encounter. It requires the patient
 * record to exist and not be deleted, enforces provider identity match, and
 * ensures all business-required fields are present. The created encounter
 * contains all metadata, linkage, and status as required.
 *
 * @param props - Object containing all necessary parameters for the operation
 * @param props.medicalDoctor - The authenticated medical doctor creating the
 *   encounter
 * @param props.patientRecordId - The patient record ID for which to create the
 *   encounter
 * @param props.body - Request body with encounter creation details (type,
 *   times, status, notes)
 * @returns The newly created EHR encounter object, with all fields populated
 *   per business and API spec
 * @throws {Error} If the patient record does not exist or is inactive
 * @throws {Error} If the authenticated doctor does not match the
 *   provider_user_id
 */
export async function posthealthcarePlatformMedicalDoctorPatientRecordsPatientRecordIdEncounters(props: {
  medicalDoctor: MedicaldoctorPayload;
  patientRecordId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformEhrEncounter.ICreate;
}): Promise<IHealthcarePlatformEhrEncounter> {
  const { medicalDoctor, patientRecordId, body } = props;

  // Enforce provider identity (doctor can only create own encounter)
  if (body.provider_user_id !== medicalDoctor.id) {
    throw new Error(
      "Provider user ID does not match authenticated medical doctor.",
    );
  }

  // Ensure patient record exists and is ACTIVE (not soft deleted)
  const patientRecord =
    await MyGlobal.prisma.healthcare_platform_patient_records.findFirst({
      where: { id: patientRecordId, deleted_at: null },
      select: { id: true },
    });
  if (!patientRecord) {
    throw new Error("Patient record not found or is inactive.");
  }

  // Prepare ID and timestamps as ISO strings
  const encounterId: string & tags.Format<"uuid"> = v4();
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Create the EHR encounter in the database
  const created =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.create({
      data: {
        id: encounterId,
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

  // Return as API DTO with strict typing and explicit nulls
  return {
    id: created.id,
    patient_record_id: created.patient_record_id,
    provider_user_id: created.provider_user_id,
    encounter_type: created.encounter_type,
    encounter_start_at: created.encounter_start_at,
    encounter_end_at: created.encounter_end_at ?? null,
    status: created.status,
    notes: created.notes ?? null,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at ?? null,
  };
}
