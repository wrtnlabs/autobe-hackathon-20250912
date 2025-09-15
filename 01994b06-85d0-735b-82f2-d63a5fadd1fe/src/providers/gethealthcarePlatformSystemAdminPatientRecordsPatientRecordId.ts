import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve a specific patient record by ID from
 * healthcare_platform_patient_records database table.
 *
 * This endpoint allows a system administrator to fetch a full patient record
 * profile by its unique patientRecordId, including all business, demographic,
 * and PHI fields as specified. It enforces soft-delete by excluding records
 * with deleted_at set. Access is platform-wide for system admins, requiring
 * prior authentication; audit logging is handled externally.
 *
 * @param props - Object containing all parameters for the operation
 * @param props.systemAdmin - The authenticated system admin making this request
 * @param props.patientRecordId - Unique identifier of the patient record to
 *   retrieve
 * @returns The full patient record as defined by
 *   IHealthcarePlatformPatientRecord
 * @throws {Error} When patient record is not found or has been deleted (soft
 *   delete)
 */
export async function gethealthcarePlatformSystemAdminPatientRecordsPatientRecordId(props: {
  systemAdmin: SystemadminPayload;
  patientRecordId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformPatientRecord> {
  const { patientRecordId } = props;
  const record =
    await MyGlobal.prisma.healthcare_platform_patient_records.findFirst({
      where: { id: patientRecordId, deleted_at: null },
    });
  if (!record) throw new Error("Patient record not found or already deleted");
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
