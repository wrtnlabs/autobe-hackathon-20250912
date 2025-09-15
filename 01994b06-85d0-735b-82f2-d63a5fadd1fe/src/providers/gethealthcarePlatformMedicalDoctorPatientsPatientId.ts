import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Retrieve a specific patient profile by patientId from
 * healthcare_platform_patients.
 *
 * This endpoint allows an authenticated medical doctor to fetch a detailed
 * patient profile based on a unique patientId. Only current, non-deleted
 * patient records are returned. The function enforces contract-level
 * authentication by requiring MedicaldoctorPayload, and filters out any
 * soft-deleted records (deleted_at not null). Return values conform to the
 * exact IHealthcarePlatformPatient DTO, with all date fields converted to
 * string & tags.Format<'date-time'> using toISOStringSafe.
 *
 * @param props - Object containing the authenticated medical doctor payload and
 *   the target patient's ID
 * @param props.medicalDoctor - The authenticated medical doctor making the
 *   request
 * @param props.patientId - Unique identifier of the target patient user
 * @returns The detailed patient user profile (IHealthcarePlatformPatient) if
 *   found and active
 * @throws {Error} If no matching, non-deleted patient is found, throws "Patient
 *   not found"
 */
export async function gethealthcarePlatformMedicalDoctorPatientsPatientId(props: {
  medicalDoctor: MedicaldoctorPayload;
  patientId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformPatient> {
  const { patientId } = props;
  // Query for the active, non-deleted patient by id
  const patient = await MyGlobal.prisma.healthcare_platform_patients.findFirst({
    where: {
      id: patientId,
      deleted_at: null,
    },
  });
  if (!patient) {
    throw new Error("Patient not found");
  }
  return {
    id: patient.id,
    email: patient.email,
    full_name: patient.full_name,
    date_of_birth: toISOStringSafe(patient.date_of_birth),
    phone: patient.phone ?? null,
    created_at: toISOStringSafe(patient.created_at),
    updated_at: toISOStringSafe(patient.updated_at),
    // deleted_at is optional, nullable: include only if present
    ...(patient.deleted_at !== undefined &&
      patient.deleted_at !== null && {
        deleted_at: toISOStringSafe(patient.deleted_at),
      }),
  };
}
