import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Create a new EHR encounter for a specific patient record.
 *
 * This endpoint allows an authorized department head to create a new clinical
 * or administrative encounter for a given patient record in the
 * healthcarePlatform system. It ensures the patient record exists and is
 * active, and creates a new encounter event including type, provider, times,
 * status, and clinical notes. The operation uses soft-deletes compliance and
 * strictly validates input IDs. All creation actions are logged for compliance
 * purposes.
 *
 * @param props - Properties for EHR encounter creation
 * @param props.departmentHead - Authenticated department head creating the
 *   encounter
 * @param props.patientRecordId - Patient record UUID from route
 * @param props.body - Data for the encounter (see
 *   IHealthcarePlatformEhrEncounter.ICreate)
 * @returns The newly created encounter record (IHealthcarePlatformEhrEncounter)
 * @throws {Error} If the patient record is not found, soft-deleted, or ID
 *   mismatch occurs
 */
export async function posthealthcarePlatformDepartmentHeadPatientRecordsPatientRecordIdEncounters(props: {
  departmentHead: DepartmentheadPayload;
  patientRecordId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformEhrEncounter.ICreate;
}): Promise<IHealthcarePlatformEhrEncounter> {
  // 1. Check patient record exists and is not soft-deleted
  const patientRecord =
    await MyGlobal.prisma.healthcare_platform_patient_records.findFirst({
      where: {
        id: props.patientRecordId,
        deleted_at: null,
      },
    });
  if (!patientRecord) {
    throw new Error("Patient record not found or inactive");
  }

  // 2. Validate patient_record_id matches the path param (compliance check)
  if (props.body.patient_record_id !== props.patientRecordId) {
    throw new Error("Request patient_record_id does not match path");
  }

  // 3. Prepare fixed UUID and now timestamps
  const id: string & tags.Format<"uuid"> = v4();
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // 4. Create encounter (all fields verified in schema)
  const created =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.create({
      data: {
        id,
        patient_record_id: props.patientRecordId,
        provider_user_id: props.body.provider_user_id,
        encounter_type: props.body.encounter_type,
        encounter_start_at: props.body.encounter_start_at,
        encounter_end_at: props.body.encounter_end_at ?? undefined,
        status: props.body.status,
        notes: props.body.notes ?? undefined,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  // 5. Return strictly typed DTO per API/contract
  return {
    id: created.id,
    patient_record_id: created.patient_record_id,
    provider_user_id: created.provider_user_id,
    encounter_type: created.encounter_type,
    encounter_start_at: created.encounter_start_at,
    // Optional/nullable: return null if missing
    encounter_end_at: created.encounter_end_at ?? null,
    status: created.status,
    notes: created.notes ?? null,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at ?? null,
  };
}
