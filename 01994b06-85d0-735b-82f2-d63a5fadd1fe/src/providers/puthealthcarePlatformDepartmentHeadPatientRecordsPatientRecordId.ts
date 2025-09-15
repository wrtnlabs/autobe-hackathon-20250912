import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Update a specific patient record in the healthcare platform.
 *
 * This endpoint allows an authorized department head to update permitted fields
 * (such as full name, department assignment, demographics, gender, status,
 * etc.) of an existing patient record, identified by its unique
 * patientRecordId.
 *
 * Only mutable profile and demographic fields may be updated. Organization,
 * patient user reference, and record creation time are immutable. Regulatory
 * and business boundaries for soft deletion, compliance, and audit are
 * preserved. All updates set the updated_at field.
 *
 * @param props - Input properties
 * @param props.departmentHead - The authenticated department head making the
 *   request
 * @param props.patientRecordId - UUID of the patient record to update
 * @param props.body - Fields to update in the patient record entry (partial
 *   update allowed)
 * @returns The updated patient record reflecting all permitted changes
 * @throws {Error} If the patient record is not found
 */
export async function puthealthcarePlatformDepartmentHeadPatientRecordsPatientRecordId(props: {
  departmentHead: DepartmentheadPayload;
  patientRecordId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformPatientRecord.IUpdate;
}): Promise<IHealthcarePlatformPatientRecord> {
  const { departmentHead, patientRecordId, body } = props;

  const record =
    await MyGlobal.prisma.healthcare_platform_patient_records.findUnique({
      where: { id: patientRecordId },
    });
  if (!record) throw new Error("Patient record not found");

  // Only update allowed mutable fields, always update updated_at
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.healthcare_platform_patient_records.update({
      where: { id: patientRecordId },
      data: {
        department_id:
          body.department_id === undefined ? undefined : body.department_id,
        external_patient_number:
          body.external_patient_number === undefined
            ? undefined
            : body.external_patient_number,
        full_name: body.full_name === undefined ? undefined : body.full_name,
        dob: body.dob === undefined ? undefined : toISOStringSafe(body.dob),
        gender: body.gender === undefined ? undefined : body.gender,
        status: body.status === undefined ? undefined : body.status,
        demographics_json:
          body.demographics_json === undefined
            ? undefined
            : body.demographics_json,
        deleted_at:
          body.deleted_at === undefined
            ? undefined
            : body.deleted_at === null
              ? null
              : toISOStringSafe(body.deleted_at),
        updated_at: now,
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
    updated_at: now,
    deleted_at:
      updated.deleted_at === null || updated.deleted_at === undefined
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
