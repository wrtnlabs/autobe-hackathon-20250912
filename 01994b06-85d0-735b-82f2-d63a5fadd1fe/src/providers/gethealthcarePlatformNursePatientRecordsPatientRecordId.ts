import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import { NursePayload } from "../decorators/payload/NursePayload";

/**
 * Retrieve a specific patient record by ID from
 * healthcare_platform_patient_records database table.
 *
 * This endpoint allows an authenticated nurse to fetch a detailed profile for a
 * patient record, as identified by `patientRecordId`. The function enforces PHI
 * boundaries by confirming the patient record is not soft-deleted and the
 * requesting nurse is an active user. Optionally, further org/department
 * assignment validation should be layered as per the organization's scoping
 * model (not handled here due to lack of explicit schema linkage).
 *
 * All datetime fields are returned as ISO 8601, and field nullability is
 * strictly respected without use of native Date or assertion patterns.
 *
 * @param props - Object containing request context
 * @param props.nurse - Authenticated nurse making the request (payload with id,
 *   type)
 * @param props.patientRecordId - UUID for the patient record to retrieve
 * @returns IHealthcarePlatformPatientRecord - Full patient record profile DTO
 * @throws {Error} If patient record is not found, deleted, or nurse is
 *   ineligible
 */
export async function gethealthcarePlatformNursePatientRecordsPatientRecordId(props: {
  nurse: NursePayload;
  patientRecordId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformPatientRecord> {
  const { nurse, patientRecordId } = props;
  // 1. Lookup patient record and verify it's not soft deleted
  const record =
    await MyGlobal.prisma.healthcare_platform_patient_records.findFirst({
      where: { id: patientRecordId, deleted_at: null },
    });
  if (!record) {
    throw new Error("Patient record not found or has been deleted");
  }
  // 2. Validate nurse is active (not deleted)
  const nurseRecord =
    await MyGlobal.prisma.healthcare_platform_nurses.findFirst({
      where: { id: nurse.id, deleted_at: null },
    });
  if (!nurseRecord) {
    throw new Error("Nurse account not found or is deleted");
  }
  // TODO: If the org assignment is accessible from nurse or a join table, enforce that nurse can only view records in their organization.

  // 3. Field mapping, date/time safe conversion/branding, and type-safe null/undefined mapping
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
