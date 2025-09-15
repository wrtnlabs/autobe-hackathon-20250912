import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update an existing patient record identified by patientRecordId in the main
 * patient records schema.
 *
 * This endpoint enables an authenticated system administrator to update allowed
 * fields of a specific patient record using its UUID. Allowed changes include
 * department_id, external_patient_number, full_name, dob, gender, status,
 * demographics_json, and deleted_at. Immutable fields such as organization_id
 * or patient_user_id cannot be altered by this operation. All updates are
 * subject to soft-delete status checks and audit requirements; attempts to
 * modify soft-deleted records are rejected.
 *
 * @param props - Object containing:
 *
 *   - SystemAdmin: SystemadminPayload (authenticated system admin)
 *   - PatientRecordId: string & tags.Format<'uuid'> (UUID of target patient record)
 *   - Body: IHealthcarePlatformPatientRecord.IUpdate (fields to update)
 *
 * @returns The updated patient record, matching the
 *   IHealthcarePlatformPatientRecord contract
 * @throws {Error} If the patient record does not exist or is soft-deleted
 *   (archived)
 */
export async function puthealthcarePlatformSystemAdminPatientRecordsPatientRecordId(props: {
  systemAdmin: SystemadminPayload;
  patientRecordId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformPatientRecord.IUpdate;
}): Promise<IHealthcarePlatformPatientRecord> {
  const { systemAdmin, patientRecordId, body } = props;

  // 1. Fetch patient record (only update if not soft-deleted)
  const record =
    await MyGlobal.prisma.healthcare_platform_patient_records.findUniqueOrThrow(
      {
        where: { id: patientRecordId },
      },
    );
  if (record.deleted_at !== null) {
    throw new Error("Cannot update record: patient is archived/deleted.");
  }

  // TODO: Legal hold, privacy flag, and explicit patient consent enforcement would go here (if schema provides links)
  // TODO: Audit/amendment/versioning logging should be triggered by business layer or further queries

  // 2. Prepare data for update (allow partial update, skip undefined fields)
  // updated_at always updated
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.healthcare_platform_patient_records.update({
    where: { id: patientRecordId },
    data: {
      department_id: body.department_id ?? undefined,
      external_patient_number: body.external_patient_number ?? undefined,
      full_name: body.full_name ?? undefined,
      dob: body.dob !== undefined ? toISOStringSafe(body.dob) : undefined,
      gender: body.gender ?? undefined,
      status: body.status ?? undefined,
      demographics_json: body.demographics_json ?? undefined,
      deleted_at:
        body.deleted_at !== undefined
          ? body.deleted_at === null
            ? null
            : toISOStringSafe(body.deleted_at)
          : undefined,
      updated_at: now,
    },
  });

  // 3. Fetch the updated row for return
  const updated =
    await MyGlobal.prisma.healthcare_platform_patient_records.findUniqueOrThrow(
      {
        where: { id: patientRecordId },
      },
    );

  // 4. Build response matching IHealthcarePlatformPatientRecord exactly
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
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : updated.deleted_at === null
          ? null
          : undefined,
  };
}
