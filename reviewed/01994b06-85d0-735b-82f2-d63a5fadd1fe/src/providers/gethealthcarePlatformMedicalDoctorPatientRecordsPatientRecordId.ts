import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Retrieve a specific patient record by ID from
 * healthcare_platform_patient_records database table.
 *
 * This endpoint allows a licensed medical doctor to retrieve a comprehensive
 * patient record profile, including demographic, organizational, and clinical
 * anchor fields as modeled in the patient records schema. Access is only
 * granted if the doctor is assigned (via user_org_assignment) to the same
 * organization as the patient record, and if the record is not soft-deleted
 * (deleted_at).
 *
 * @param props - Properties required for retrieving the patient record
 * @param props.medicalDoctor - The authenticated MedicaldoctorPayload (must be
 *   an active medicalDoctor per decorator)
 * @param props.patientRecordId - Unique identifier (UUID) of the patient record
 *   to retrieve
 * @returns The full IHealthcarePlatformPatientRecord entity as defined by the
 *   schema and API contract
 * @throws {Error} When the record does not exist, is soft-deleted, or the
 *   caller's organization does not match the patient record's organization
 */
export async function gethealthcarePlatformMedicalDoctorPatientRecordsPatientRecordId(props: {
  medicalDoctor: MedicaldoctorPayload;
  patientRecordId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformPatientRecord> {
  const { medicalDoctor, patientRecordId } = props;

  // 1. Fetch the patient record by its primary key, enforce soft-delete semantics.
  const record =
    await MyGlobal.prisma.healthcare_platform_patient_records.findFirst({
      where: {
        id: patientRecordId,
        deleted_at: null, // only return non-deleted (active) records
      },
    });
  if (!record) {
    throw new Error("Patient record not found");
  }

  // 2. Fetch the doctor's organization assignment for access control.
  const assignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: medicalDoctor.id,
      },
    });
  if (!assignment) {
    throw new Error(
      "Access denied: Doctor is not assigned to any organization",
    );
  }
  if (
    record.organization_id !== assignment.healthcare_platform_organization_id
  ) {
    throw new Error(
      "Access denied: Doctor is not permitted to access this patient record (organization mismatch)",
    );
  }

  // 3. Return the patient record with all fields normalized for API response types and date-time branding
  return {
    id: record.id,
    organization_id: record.organization_id,
    department_id: record.department_id ?? undefined,
    patient_user_id: record.patient_user_id,
    external_patient_number: record.external_patient_number ?? undefined,
    full_name: record.full_name,
    dob: toISOStringSafe(record.dob),
    gender: record.gender ?? undefined,
    status: record.status,
    demographics_json: record.demographics_json ?? undefined,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at
      ? toISOStringSafe(record.deleted_at)
      : undefined,
  };
}
