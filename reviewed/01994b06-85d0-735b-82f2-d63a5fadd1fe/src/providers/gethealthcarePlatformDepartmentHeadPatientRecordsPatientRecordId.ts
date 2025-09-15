import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Retrieve a specific patient record by ID from
 * healthcare_platform_patient_records database table.
 *
 * This operation fetches a full patient record entity using its unique
 * patientRecordId. Access is only granted to department heads responsible for
 * the corresponding department (department_id of the record must match the
 * departmentHead's id). The operation enforces soft-delete by excluding records
 * with non-null deleted_at and returns all regulated fields, transforming all
 * date fields to ISO-8601 strings. Authorization errors and missing records are
 * reported as errors.
 *
 * @param props - The operation properties
 * @param props.departmentHead - Authenticated department head payload (must
 *   match department_id)
 * @param props.patientRecordId - The UUID of the patient record entity
 * @returns The full patient record entity for the patientRecordId
 * @throws {Error} When the record does not exist, is deleted, or department
 *   head is not authorized for this department
 */
export async function gethealthcarePlatformDepartmentHeadPatientRecordsPatientRecordId(props: {
  departmentHead: DepartmentheadPayload;
  patientRecordId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformPatientRecord> {
  const { departmentHead, patientRecordId } = props;

  const record =
    await MyGlobal.prisma.healthcare_platform_patient_records.findFirst({
      where: {
        id: patientRecordId,
        deleted_at: null,
      },
    });

  if (!record) throw new Error("Patient record not found");

  if (!record.department_id || record.department_id !== departmentHead.id) {
    throw new Error(
      "Unauthorized: Department head does not have access to this patient record",
    );
  }

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
