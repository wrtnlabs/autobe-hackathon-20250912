import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import { PatientPayload } from "../decorators/payload/PatientPayload";

/**
 * Retrieve a specific patient profile by patientId from
 * healthcare_platform_patients.
 *
 * This endpoint returns a detailed patient profile for the requesting patient
 * user. It enforces strict self-access boundaries: only the authenticated
 * patient is allowed to view their own profile via this API. All patient
 * information is sourced from the healthcare_platform_patients table and only
 * active (not soft-deleted) accounts are returned.
 *
 * @param props - Object containing patient authentication and the patientId
 *   parameter
 * @param props.patient - The authenticated patient payload (must match
 *   patientId)
 * @param props.patientId - The unique patient ID to lookup
 * @returns Detailed IHealthcarePlatformPatient profile for the user
 * @throws {Error} If the requesting patient does not match the patientId
 *   (unauthorized)
 * @throws {Error} If the patient profile is not found or is soft-deleted
 */
export async function gethealthcarePlatformPatientPatientsPatientId(props: {
  patient: { id: string & tags.Format<"uuid">; type: "patient" };
  patientId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformPatient> {
  const { patient, patientId } = props;
  // Enforce strict self-access: patient can only see their own record
  if (patient.id !== patientId) {
    throw new Error("Unauthorized: patients may only access their own profile");
  }
  const found = await MyGlobal.prisma.healthcare_platform_patients.findFirst({
    where: {
      id: patientId,
      deleted_at: null,
    },
  });
  if (!found) {
    throw new Error("Patient profile not found or account is deleted");
  }
  return {
    id: found.id,
    email: found.email,
    full_name: found.full_name,
    date_of_birth: toISOStringSafe(found.date_of_birth),
    phone: found.phone ?? null,
    created_at: toISOStringSafe(found.created_at),
    updated_at: toISOStringSafe(found.updated_at),
    ...(typeof found.deleted_at !== "undefined" && found.deleted_at !== null
      ? {
          deleted_at: found.deleted_at
            ? toISOStringSafe(found.deleted_at)
            : null,
        }
      : {}),
  };
}
