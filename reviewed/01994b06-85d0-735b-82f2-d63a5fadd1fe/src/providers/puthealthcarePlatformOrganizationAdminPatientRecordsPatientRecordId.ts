import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update a specific patient record by its ID.
 *
 * This endpoint updates allowed fields (name, demographics, department, etc) of
 * a patient record as identified by `patientRecordId`, ensuring that only
 * organization admins of the parent org may modify the record. Immutable fields
 * (organization linkage, primary patient reference, audit fields) are not
 * editable. All modifications update the audit timestamp and return the full,
 * updated record.
 *
 * Authorization: Only organizationAdmin users may update records belonging to
 * their own organization.
 *
 * @param props - OrganizationAdmin: The authenticated admin user performing the
 *   update patientRecordId: UUID of the patient record to update body:
 *   Permitted profile field updates
 * @returns The updated patient record (all fields)
 * @throws {Error} If the patient record does not exist or does not belong to
 *   the admin's organization
 */
export async function puthealthcarePlatformOrganizationAdminPatientRecordsPatientRecordId(props: {
  organizationAdmin: OrganizationadminPayload;
  patientRecordId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformPatientRecord.IUpdate;
}): Promise<IHealthcarePlatformPatientRecord> {
  const { organizationAdmin, patientRecordId, body } = props;

  // Fetch the record and check organizational ownership
  const record =
    await MyGlobal.prisma.healthcare_platform_patient_records.findFirst({
      where: { id: patientRecordId },
    });
  if (!record) throw new Error("Patient record not found");
  if (record.organization_id !== organizationAdmin.id) {
    throw new Error(
      "Unauthorized: Admin may only update records in their own organization",
    );
  }

  // Prepare update data -- only modifiable fields
  const data = {
    ...(body.department_id !== undefined && {
      department_id: body.department_id,
    }),
    ...(body.external_patient_number !== undefined && {
      external_patient_number: body.external_patient_number,
    }),
    ...(body.full_name !== undefined && { full_name: body.full_name }),
    ...(body.dob !== undefined && { dob: body.dob }),
    ...(body.gender !== undefined && { gender: body.gender }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.demographics_json !== undefined && {
      demographics_json: body.demographics_json,
    }),
    ...(body.deleted_at !== undefined && { deleted_at: body.deleted_at }),
    updated_at: toISOStringSafe(new Date()),
  };

  const updated =
    await MyGlobal.prisma.healthcare_platform_patient_records.update({
      where: { id: patientRecordId },
      data,
    });

  // Return DTO fields, converting all date fields
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
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
