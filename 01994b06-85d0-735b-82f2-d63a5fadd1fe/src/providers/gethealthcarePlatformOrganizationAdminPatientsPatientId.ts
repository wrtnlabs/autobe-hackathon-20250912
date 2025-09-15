import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve a specific patient profile by patientId from
 * healthcare_platform_patients.
 *
 * This endpoint allows an authenticated organization admin to fetch the core
 * profile of a patient (email, name, DOB, phone, audit timestamps) provided the
 * patient belongs to the same organization as the admin and is not soft
 * deleted. Data isolation and strict tenant boundary enforcement apply—patients
 * outside the admin's org or with deleted status are inaccessible. All access
 * events should be audit-logged per policy (logging handled elsewhere). Throws
 * when unauthorized or not found.
 *
 * @param props - Parameters object
 * @param props.organizationAdmin - The organization admin payload (must be
 *   actively assigned to the org)
 * @param props.patientId - Unique UUID of the patient to look up
 * @returns Patient profile as IHealthcarePlatformPatient
 * @throws {Error} When admin is unassigned, or if patient does not exist, is
 *   deleted, or is outside admin's organization scope
 */
export async function gethealthcarePlatformOrganizationAdminPatientsPatientId(props: {
  organizationAdmin: OrganizationadminPayload;
  patientId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformPatient> {
  // Step 1: Lookup organization assignment for admin
  const assignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: { user_id: props.organizationAdmin.id, deleted_at: null },
      select: { healthcare_platform_organization_id: true },
    });
  if (!assignment)
    throw new Error(
      "Unauthorized: organization admin assignment not found or deleted.",
    );
  const adminOrgId = assignment.healthcare_platform_organization_id;

  // Step 2: Fetch the patient plus patient record to verify tenant scope
  const patient = await MyGlobal.prisma.healthcare_platform_patients.findFirst({
    where: { id: props.patientId, deleted_at: null },
    select: {
      id: true,
      email: true,
      full_name: true,
      date_of_birth: true,
      phone: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      healthcare_platform_patient_records: {
        select: { organization_id: true, deleted_at: true },
      },
    },
  });
  if (!patient)
    throw new Error("Patient not found, soft deleted, or inaccessible.");

  // Step 3: Patient tenant scope check (must belong to same org and record must not be deleted)
  const patientRecord = patient.healthcare_platform_patient_records;
  if (
    !patientRecord ||
    patientRecord.deleted_at !== null ||
    patientRecord.organization_id !== adminOrgId
  ) {
    throw new Error(
      "Forbidden: Patient does not belong to your organization or is no longer active.",
    );
  }

  // Step 4: Map result fields to API DTO, converting all date/datetime fields
  return {
    id: patient.id,
    email: patient.email,
    full_name: patient.full_name,
    date_of_birth: toISOStringSafe(patient.date_of_birth),
    phone: typeof patient.phone === "string" ? patient.phone : undefined,
    created_at: toISOStringSafe(patient.created_at),
    updated_at: toISOStringSafe(patient.updated_at),
    deleted_at:
      patient.deleted_at !== null && patient.deleted_at !== undefined
        ? toISOStringSafe(patient.deleted_at)
        : undefined,
  };
}
