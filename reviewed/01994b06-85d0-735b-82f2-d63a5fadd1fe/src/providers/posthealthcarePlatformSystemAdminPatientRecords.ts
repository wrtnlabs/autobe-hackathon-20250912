import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new patient record in healthcare_platform_patient_records.
 *
 * This endpoint allows a system administrator to create a complete patient
 * record for a user who exists and is assigned to the organization. It
 * validates that the patient exists and is currently assigned to the specified
 * organization, and will not create a record if one already exists for this
 * patient.
 *
 * All relevant fields, including demographic metadata and references, are
 * populated. Timestamps and system fields are generated and managed by the
 * system, and audit-compliance is enforced via validation and error handling.
 *
 * @param props - Object containing parameters for creation
 * @param props.systemAdmin - The authenticated SystemadminPayload (must be type
 *   'systemAdmin')
 * @param props.body - IHealthcarePlatformPatientRecord.ICreate (patient record
 *   creation request)
 * @returns The newly created IHealthcarePlatformPatientRecord with all fields
 *   populated for API contract compliance
 * @throws {Error} If patient does not exist, is not properly assigned to
 *   organization, or if a patient record already exists for this user
 */
export async function posthealthcarePlatformSystemAdminPatientRecords(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformPatientRecord.ICreate;
}): Promise<IHealthcarePlatformPatientRecord> {
  // Authorization is enforced by the SystemadminAuth decorator, but double-check type for defense-in-depth
  if (props.systemAdmin.type !== "systemAdmin") {
    throw new Error("Forbidden: not a systemAdmin");
  }

  // Step 1: Confirm patient exists
  const patient = await MyGlobal.prisma.healthcare_platform_patients.findFirst({
    where: { id: props.body.patient_user_id },
  });
  if (!patient) {
    throw new Error("Patient does not exist");
  }

  // Step 2: Confirm assignment (user_org_assignment exists and is active)
  const assignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: props.body.patient_user_id,
        healthcare_platform_organization_id: props.body.organization_id,
        assignment_status: "active",
      },
    });
  if (!assignment) {
    throw new Error("Patient is not assigned to the organization");
  }

  // Step 3: No duplicate patient record per patient_user_id
  const existing =
    await MyGlobal.prisma.healthcare_platform_patient_records.findFirst({
      where: { patient_user_id: props.body.patient_user_id },
    });
  if (existing) {
    throw new Error("Patient record already exists for this user");
  }

  // Step 4: Create the new record
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.healthcare_platform_patient_records.create({
      data: {
        id: v4(),
        organization_id: props.body.organization_id,
        department_id: props.body.department_id ?? null,
        patient_user_id: props.body.patient_user_id,
        external_patient_number: props.body.external_patient_number ?? null,
        full_name: props.body.full_name,
        dob: props.body.dob,
        gender: props.body.gender ?? null,
        status: props.body.status,
        demographics_json: props.body.demographics_json ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  return {
    id: created.id,
    organization_id: created.organization_id,
    department_id: created.department_id,
    patient_user_id: created.patient_user_id,
    external_patient_number: created.external_patient_number,
    full_name: created.full_name,
    dob: created.dob,
    gender: created.gender,
    status: created.status,
    demographics_json: created.demographics_json,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at,
  };
}
