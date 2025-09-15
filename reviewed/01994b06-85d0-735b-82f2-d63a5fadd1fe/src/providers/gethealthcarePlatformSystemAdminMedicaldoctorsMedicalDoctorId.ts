import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Get detailed information for a specific medical doctor profile
 * (healthcare_platform_medicaldoctors).
 *
 * This operation retrieves a single medical doctor's profile from the
 * healthcare platform, by unique identifier. Only active (not deleted) profiles
 * are accessible. The function enforces strict role-based access, requires
 * caller authorization as a system administrator, and will throw if the record
 * is missing or soft-deleted. All audit and compliance controls upstream. Dates
 * are strictly converted to ISO strings, no native Date usage.
 *
 * @param props - Request properties
 * @param props.systemAdmin - The authenticated system administrator making the
 *   request (contract enforced via decorator)
 * @param props.medicalDoctorId - The UUID of the medical doctor to retrieve
 * @returns The detailed IHealthcarePlatformMedicalDoctor profile, with all
 *   database and business fields populated and all dates safely formatted
 * @throws {Error} If the doctor does not exist or is deleted (soft-delete
 *   enforced)
 */
export async function gethealthcarePlatformSystemAdminMedicaldoctorsMedicalDoctorId(props: {
  systemAdmin: SystemadminPayload;
  medicalDoctorId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformMedicalDoctor> {
  const { medicalDoctorId } = props;

  const doctor =
    await MyGlobal.prisma.healthcare_platform_medicaldoctors.findFirstOrThrow({
      where: {
        id: medicalDoctorId,
        deleted_at: null,
      },
    });

  return {
    id: doctor.id,
    email: doctor.email,
    full_name: doctor.full_name,
    npi_number: doctor.npi_number,
    specialty: doctor.specialty === null ? undefined : doctor.specialty,
    phone: doctor.phone === null ? undefined : doctor.phone,
    created_at: toISOStringSafe(doctor.created_at),
    updated_at: toISOStringSafe(doctor.updated_at),
    deleted_at:
      doctor.deleted_at === null || doctor.deleted_at === undefined
        ? null
        : toISOStringSafe(doctor.deleted_at),
  };
}
