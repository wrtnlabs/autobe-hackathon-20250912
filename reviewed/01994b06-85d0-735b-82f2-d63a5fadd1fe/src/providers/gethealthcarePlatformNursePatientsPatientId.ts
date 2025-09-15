import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import { NursePayload } from "../decorators/payload/NursePayload";

/**
 * Retrieve a specific patient profile by patientId from
 * healthcare_platform_patients.
 *
 * This endpoint fetches an active (not soft-deleted) patient user profile by
 * unique ID. It strictly enforces cross-tenant data isolation: only nurses
 * associated with the same organization as the patient may access the profile.
 * All date/datetime values are ISO 8601 strings. Throws if no such patient, or
 * if access is not permitted by tenant assignment.
 *
 * @param props - Object containing nurse payload and patientId.
 * @param props.nurse - Authenticated nurse making the request.
 * @param props.patientId - Unique UUID of the patient user profile.
 * @returns The detailed IHealthcarePlatformPatient profile data.
 * @throws {Error} If patient is not found, deleted, or access is not allowed.
 */
export async function gethealthcarePlatformNursePatientsPatientId(props: {
  nurse: NursePayload;
  patientId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformPatient> {
  const { nurse, patientId } = props;

  // 1. Find this nurse's organizations via user_org_assignments
  const nurseAssignments =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findMany({
      where: { user_id: nurse.id },
      select: { healthcare_platform_organization_id: true },
    });
  if (!nurseAssignments.length) {
    throw new Error("Unauthorized: Nurse has no organization assignment");
  }
  const nurseOrgIds: string[] = nurseAssignments.map(
    (a) => a.healthcare_platform_organization_id,
  );

  // 2. Find base patient info, active profile only
  const patient = await MyGlobal.prisma.healthcare_platform_patients.findFirst({
    where: { id: patientId, deleted_at: null },
    select: {
      id: true,
      email: true,
      full_name: true,
      date_of_birth: true,
      phone: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!patient) throw new Error("Patient not found or deleted");

  // 3. Enforce org-level access: get patient's org via patient_records
  const patientRecord =
    await MyGlobal.prisma.healthcare_platform_patient_records.findFirst({
      where: { patient_user_id: patientId },
      select: { organization_id: true },
    });
  if (!patientRecord || !nurseOrgIds.includes(patientRecord.organization_id)) {
    throw new Error(
      "Unauthorized: Nurse cannot access patient outside their organization(s)",
    );
  }

  // 4. Format output according to DTO: brand date fields and handle phone/deleted_at nullable/optional
  return {
    id: patient.id,
    email: patient.email,
    full_name: patient.full_name,
    date_of_birth: toISOStringSafe(patient.date_of_birth),
    phone: patient.phone ?? undefined,
    created_at: toISOStringSafe(patient.created_at),
    updated_at: toISOStringSafe(patient.updated_at),
    deleted_at: patient.deleted_at
      ? toISOStringSafe(patient.deleted_at)
      : undefined,
  };
}
