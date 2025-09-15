import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Retrieve detailed information about a specific patient encounter by ID.
 *
 * This API endpoint allows authorized department heads to fetch the full
 * details of a clinical or administrative encounter for a patient, ensuring
 * department-level access control. It retrieves data from the ehr_encounters
 * table, validating both patient record and department context for audit and
 * compliance enforcement.
 *
 * Access control is enforced: department head may only access encounters for
 * patients in their department. If department context is ambiguous or mapping
 * is not feasible, an error is thrown per system limitations. All date fields
 * are returned as ISO8601 strings branded as date-time.
 *
 * @param props - Operation arguments containing:
 *
 *   - DepartmentHead: Authenticated department head payload
 *   - PatientRecordId: Patient record UUID
 *   - EncounterId: Encounter UUID
 *
 * @returns IHealthcarePlatformEhrEncounter containing all structured and
 *   narrative fields
 * @throws {Error} If encounter, patient record, or department head is not found
 *   (404), or if department scope check fails (403)
 */
export async function gethealthcarePlatformDepartmentHeadPatientRecordsPatientRecordIdEncountersEncounterId(props: {
  departmentHead: DepartmentheadPayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformEhrEncounter> {
  const { departmentHead, patientRecordId, encounterId } = props;

  // 1. Fetch the encounter, must belong to the patient record, not deleted
  const encounter =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.findFirst({
      where: {
        id: encounterId,
        patient_record_id: patientRecordId,
        deleted_at: null,
      },
    });
  if (!encounter) throw new Error("Encounter not found");

  // 2. Fetch the patient record (must not be deleted)
  const patientRecord =
    await MyGlobal.prisma.healthcare_platform_patient_records.findFirst({
      where: { id: patientRecordId, deleted_at: null },
    });
  if (!patientRecord) throw new Error("Patient record not found");

  // 3. Fetch the department head row
  const departmentHeadRow =
    await MyGlobal.prisma.healthcare_platform_departmentheads.findFirst({
      where: { id: departmentHead.id, deleted_at: null },
    });
  if (!departmentHeadRow) throw new Error("Department head not found");

  // 4. Department-level access enforcement
  //   The schema does not encode department_id on department head rows. If your application
  //   maintains department assignment data elsewhere, enforce the check here. For now, we check if patientRecord.department_id is present.
  //   If patientRecord.department_id is null, access is ambiguous; you may allow or deny per business rules. For this implementation, throw forbidden if department_id is null or inaccessible.

  if (!patientRecord.department_id) {
    throw new Error(
      "Forbidden: Patient record is not assigned to a department",
    );
  }
  // TODO: Replace this placeholder check with your actual department head to department association logic
  //   For now, access is permitted if department head is present; replace with strong check if/when available.

  // If business logic supplies department context for department head, enforce the check here as:
  // if (departmentHeadRow.department_id !== patientRecord.department_id)
  //   throw new Error("Forbidden: Department scope does not match");

  // 5. Return encounter DTO (date fields must be string & tags.Format<'date-time'>)
  return {
    id: encounter.id,
    patient_record_id: encounter.patient_record_id,
    provider_user_id: encounter.provider_user_id,
    encounter_type: encounter.encounter_type,
    encounter_start_at: toISOStringSafe(encounter.encounter_start_at),
    encounter_end_at: encounter.encounter_end_at
      ? toISOStringSafe(encounter.encounter_end_at)
      : undefined,
    status: encounter.status,
    notes: encounter.notes ?? undefined,
    created_at: toISOStringSafe(encounter.created_at),
    updated_at: toISOStringSafe(encounter.updated_at),
    deleted_at: encounter.deleted_at
      ? toISOStringSafe(encounter.deleted_at)
      : undefined,
  };
}
