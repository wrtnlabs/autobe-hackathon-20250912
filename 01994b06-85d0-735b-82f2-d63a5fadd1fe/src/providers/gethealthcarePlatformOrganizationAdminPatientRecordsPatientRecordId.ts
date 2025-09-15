import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve a specific patient record by ID from
 * healthcare_platform_patient_records database table.
 *
 * This endpoint allows an authenticated organization admin to retrieve a full
 * patient record profile, including all demographic, clinical anchor, and
 * status columns, while enforcing organizational data isolation and soft
 * deletion (records with deleted_at are not returned).
 *
 * @param props - Request properties
 * @param props.organizationAdmin - The authenticated organization admin
 *   retrieving the record (must match organization_id)
 * @param props.patientRecordId - The unique patient record UUID to retrieve
 * @returns The complete IHealthcarePlatformPatientRecord object with all
 *   metadata, or throws error if not found/unauthorized.
 * @throws {Error} If no record is found, if it is soft-deleted, or if the admin
 *   is not authorized for this organization.
 */
export async function gethealthcarePlatformOrganizationAdminPatientRecordsPatientRecordId(props: {
  organizationAdmin: OrganizationadminPayload;
  patientRecordId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformPatientRecord> {
  const { organizationAdmin, patientRecordId } = props;

  const record =
    await MyGlobal.prisma.healthcare_platform_patient_records.findFirst({
      where: {
        id: patientRecordId,
        deleted_at: null,
      },
    });

  if (!record) throw new Error("Patient record not found");
  if (record.organization_id !== organizationAdmin.id) {
    throw new Error("Access denied: Not in admin's organization");
  }

  return {
    id: record.id,
    organization_id: record.organization_id,
    department_id:
      typeof record.department_id === "string"
        ? record.department_id
        : undefined,
    patient_user_id: record.patient_user_id,
    external_patient_number:
      typeof record.external_patient_number === "string"
        ? record.external_patient_number
        : undefined,
    full_name: record.full_name,
    dob: toISOStringSafe(record.dob),
    gender: typeof record.gender === "string" ? record.gender : undefined,
    status: record.status,
    demographics_json:
      typeof record.demographics_json === "string"
        ? record.demographics_json
        : undefined,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at !== null && record.deleted_at !== undefined
        ? toISOStringSafe(record.deleted_at)
        : undefined,
  };
}
