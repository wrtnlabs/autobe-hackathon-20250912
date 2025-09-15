import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Update an existing patient record identified by patientRecordId in the main
 * patient records schema.
 *
 * This endpoint allows a medical doctor to update patient profile fields
 * including name, demographics, department, gender, status, and legacy medical
 * record number for the given patient record (specified by patientRecordId).
 * The update operation is subject to business validation: the record must
 * exist, cannot be soft deleted, and only approved fields are modifiable.
 * Immutable references (organization_id, patient_user_id) are not permitted to
 * change. All update attempts are regulated by compliance boundaries, but
 * direct audit/consent integration should be handled elsewhere. Timestamps are
 * updated using ISO 8601 format, with no native Date type usage.
 *
 * @param props - Properties for the update operation
 * @param props.medicalDoctor - Authenticated MedicaldoctorPayload for the
 *   acting medical doctor
 * @param props.patientRecordId - UUID identifying the patient record to update
 * @param props.body - Fields to update, as allowed by
 *   IHealthcarePlatformPatientRecord.IUpdate
 * @returns The updated patient record in canonical
 *   IHealthcarePlatformPatientRecord form
 * @throws {Error} If the patient record does not exist or is soft deleted and
 *   cannot be updated
 */
export async function puthealthcarePlatformMedicalDoctorPatientRecordsPatientRecordId(props: {
  medicalDoctor: MedicaldoctorPayload;
  patientRecordId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformPatientRecord.IUpdate;
}): Promise<IHealthcarePlatformPatientRecord> {
  const { medicalDoctor, patientRecordId, body } = props;

  // Fetch the record and enforce existence
  const record =
    await MyGlobal.prisma.healthcare_platform_patient_records.findUniqueOrThrow(
      {
        where: { id: patientRecordId },
      },
    );

  // Disallow update if record is soft deleted
  if (record.deleted_at !== null && record.deleted_at !== undefined) {
    throw new Error(
      "Patient record is archived/deleted and cannot be modified.",
    );
  }

  // Perform the update; only set fields if present
  const updated =
    await MyGlobal.prisma.healthcare_platform_patient_records.update({
      where: { id: patientRecordId },
      data: {
        department_id: body.department_id ?? undefined,
        external_patient_number: body.external_patient_number ?? undefined,
        full_name: body.full_name ?? undefined,
        dob: body.dob ?? undefined,
        gender: body.gender ?? undefined,
        status: body.status ?? undefined,
        demographics_json: body.demographics_json ?? undefined,
        deleted_at: body.deleted_at ?? undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  return {
    id: updated.id,
    organization_id: updated.organization_id,
    department_id: updated.department_id ?? undefined,
    patient_user_id: updated.patient_user_id,
    external_patient_number: updated.external_patient_number ?? undefined,
    full_name: updated.full_name,
    dob: toISOStringSafe(updated.dob),
    gender: updated.gender ?? undefined,
    status: updated.status,
    demographics_json: updated.demographics_json ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null || updated.deleted_at === undefined
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
