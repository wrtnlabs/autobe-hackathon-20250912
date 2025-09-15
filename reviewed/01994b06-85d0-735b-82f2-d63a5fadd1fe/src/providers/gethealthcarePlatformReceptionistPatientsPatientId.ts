import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import { ReceptionistPayload } from "../decorators/payload/ReceptionistPayload";

/**
 * Retrieve a specific patient profile by patientId from
 * healthcare_platform_patients.
 *
 * This operation looks up a patient by their unique ID, verifying that the
 * requesting receptionist user is authorized for the patient's organization
 * (using org assignments on both sides). Only non-deleted, active profiles are
 * returned. Date/datetime fields are converted to ISO strings for API
 * responses, and phone/deleted_at fields handle null/undefined according to DTO
 * conventions. If patient is not found, not in org scope, or receptionist has
 * no org assignment, an error is thrown. Audit logging is assumed to be handled
 * elsewhere.
 *
 * @param props - Props including authenticated receptionist payload and
 *   patientId
 * @param props.receptionist - The authenticated receptionist making the request
 * @param props.patientId - The unique UUID of the target patient
 * @returns The patient profile as IHealthcarePlatformPatient, formatted for API
 *   output
 * @throws {Error} If patient does not exist, patient org inaccessible, or
 *   receptionist not assigned to org
 */
export async function gethealthcarePlatformReceptionistPatientsPatientId(props: {
  receptionist: ReceptionistPayload;
  patientId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformPatient> {
  const { receptionist, patientId } = props;

  const patient = await MyGlobal.prisma.healthcare_platform_patients.findFirst({
    where: { id: patientId, deleted_at: null },
  });
  if (!patient) throw new Error("Patient not found");

  const patientRecord =
    await MyGlobal.prisma.healthcare_platform_patient_records.findFirst({
      where: { patient_user_id: patientId, deleted_at: null },
    });
  if (!patientRecord)
    throw new Error(
      "Unauthorized: No patient record mapping to organization found",
    );

  const receptionistAssignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: { user_id: receptionist.id, deleted_at: null },
    });
  if (!receptionistAssignment)
    throw new Error("Receptionist is not assigned to any organization");

  if (
    patientRecord.organization_id !==
    receptionistAssignment.healthcare_platform_organization_id
  ) {
    throw new Error("Unauthorized: Patient is not in your organization");
  }

  return {
    id: patient.id,
    email: patient.email,
    full_name: patient.full_name,
    date_of_birth: toISOStringSafe(patient.date_of_birth),
    phone: patient.phone !== undefined ? patient.phone : null,
    created_at: toISOStringSafe(patient.created_at),
    updated_at: toISOStringSafe(patient.updated_at),
    deleted_at:
      patient.deleted_at !== undefined && patient.deleted_at !== null
        ? toISOStringSafe(patient.deleted_at)
        : undefined,
  };
}
