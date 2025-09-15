import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new patient record in healthcare_platform_patient_records table.
 *
 * This endpoint allows for creating a new patient record for a given
 * organization and (optionally) department. Required patient user reference,
 * legal name, DOB, and business context fields are enforced; duplicate
 * assignments by patient_user_id are rejected. Timestamps are automatically
 * populated. Organization admin authentication is required and enforced
 * upstream.
 *
 * @param props - Properties for patient record creation
 * @param props.organizationAdmin - The authenticated organization admin
 *   requesting patient creation
 * @param props.body - Data for creating the new patient record (user,
 *   demographics, org/dept mapping)
 * @returns The newly created patient record, as defined by
 *   IHealthcarePlatformPatientRecord
 * @throws {Error} If a patient record for the same patient_user_id already
 *   exists
 */
export async function posthealthcarePlatformOrganizationAdminPatientRecords(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformPatientRecord.ICreate;
}): Promise<IHealthcarePlatformPatientRecord> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Enforce uniqueness for patient_user_id
  const existing =
    await MyGlobal.prisma.healthcare_platform_patient_records.findFirst({
      where: { patient_user_id: props.body.patient_user_id },
    });
  if (existing) {
    throw new Error("A patient record for this user already exists.");
  }

  // Create patient record
  const created =
    await MyGlobal.prisma.healthcare_platform_patient_records.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        organization_id: props.body.organization_id,
        department_id: props.body.department_id ?? undefined,
        patient_user_id: props.body.patient_user_id,
        external_patient_number:
          props.body.external_patient_number ?? undefined,
        full_name: props.body.full_name,
        dob: props.body.dob,
        gender: props.body.gender ?? undefined,
        status: props.body.status,
        demographics_json: props.body.demographics_json ?? undefined,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  // Transform DB result to API response type, conforming to null/undefined distinctions
  return {
    id: created.id,
    organization_id: created.organization_id,
    department_id: created.department_id ?? null,
    patient_user_id: created.patient_user_id,
    external_patient_number: created.external_patient_number ?? null,
    full_name: created.full_name,
    dob: created.dob,
    gender: created.gender ?? null,
    status: created.status,
    demographics_json: created.demographics_json ?? null,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at ?? null,
  };
}
