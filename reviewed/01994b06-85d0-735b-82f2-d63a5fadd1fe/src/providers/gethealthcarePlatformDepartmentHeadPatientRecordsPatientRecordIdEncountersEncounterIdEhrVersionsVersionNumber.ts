import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformEhrVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrVersion";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Retrieve a specific EHR version snapshot for a patient encounter by version
 * number.
 *
 * This endpoint enables authorized department heads to fetch the complete data
 * for an individual EHR version, identified by patient record ID, encounter ID,
 * and version number. All access is subject to scope enforcement.
 *
 * Department heads can only access EHR version details for encounters in
 * departments that they lead. The function strictly enforces department and
 * record linkage, existence, and department head access rights. All date fields
 * are returned as ISO 8601 date strings (no native Date objects are used at any
 * point).
 *
 * @param props - The operation input
 * @param props.departmentHead - Authenticated department head payload (type:
 *   DepartmentheadPayload)
 * @param props.patientRecordId - Target patient record UUID
 * @param props.encounterId - Target EHR encounter UUID
 * @param props.versionNumber - Monotonic version number to retrieve
 * @returns Complete EHR version snapshot object for the specified patient
 *   encounter/version
 * @throws {Error} If the encounter or patient record does not exist, department
 *   does not match, or version cannot be found
 */
export async function gethealthcarePlatformDepartmentHeadPatientRecordsPatientRecordIdEncountersEncounterIdEhrVersionsVersionNumber(props: {
  departmentHead: DepartmentheadPayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
  versionNumber: number;
}): Promise<IHealthcarePlatformEhrVersion> {
  // 1. Validate encounter linkage and existence
  const encounter =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.findFirst({
      where: {
        id: props.encounterId,
        patient_record_id: props.patientRecordId,
        deleted_at: null,
      },
      select: { patient_record_id: true },
    });
  if (!encounter) {
    throw new Error("Encounter not found for specified patient record");
  }
  // 2. Validate patient record and get department
  const patientRecord =
    await MyGlobal.prisma.healthcare_platform_patient_records.findFirst({
      where: {
        id: props.patientRecordId,
        deleted_at: null,
      },
      select: { department_id: true },
    });
  if (!patientRecord) {
    throw new Error("Patient record not found or deleted");
  }
  if (!patientRecord.department_id) {
    throw new Error("Encounter patient record has no department attached");
  }
  // 3. Validate department exists and is led by this department head
  const department =
    await MyGlobal.prisma.healthcare_platform_departments.findFirst({
      where: {
        id: patientRecord.department_id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (!department) {
    throw new Error("Department not found or deleted");
  }
  if (department.id !== props.departmentHead.id) {
    throw new Error("Access denied: You do not lead this department");
  }
  // 4. Find EHR version for given encounter and version number
  const version =
    await MyGlobal.prisma.healthcare_platform_ehr_versions.findFirst({
      where: {
        ehr_encounter_id: props.encounterId,
        version_number: props.versionNumber,
      },
    });
  if (!version) {
    throw new Error("EHR version not found");
  }
  // 5. Return data, with all date fields as branded strings and no type assertions
  const output: IHealthcarePlatformEhrVersion = {
    id: version.id,
    ehr_encounter_id: version.ehr_encounter_id,
    submitted_by_user_id: version.submitted_by_user_id,
    version_number: version.version_number,
    snapshot_json: version.snapshot_json,
    reason_for_update: version.reason_for_update ?? undefined,
    created_at: toISOStringSafe(version.created_at),
  };
  return output;
}
