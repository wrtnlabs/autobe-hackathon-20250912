import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Get detailed information for a specific medical doctor profile
 * (healthcare_platform_medicaldoctors).
 *
 * This operation retrieves the complete information for a medical doctor entity
 * in the healthcarePlatform system—encompassing identity, licensure, audit, and
 * clinical attributes as defined in the database. Provides the latest,
 * compliance-ready provider profile for clinical apps, credentialing, or admin
 * dashboards.
 *
 * Security: Only accessible to authenticated organization administrators.
 * Attempts to fetch non-existent or soft-deleted medical doctor records result
 * in an error.
 *
 * @param props - Input properties for the operation
 * @param props.organizationAdmin - Authenticated organization admin user making
 *   the request
 * @param props.medicalDoctorId - Target medical doctor's UUID (primary key)
 * @returns IHealthcarePlatformMedicalDoctor - Complete, up-to-date doctor
 *   profile as exposed by the API
 * @throws {Error} If the record does not exist or is soft-deleted
 */
export async function gethealthcarePlatformOrganizationAdminMedicaldoctorsMedicalDoctorId(props: {
  organizationAdmin: OrganizationadminPayload;
  medicalDoctorId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformMedicalDoctor> {
  const doctor =
    await MyGlobal.prisma.healthcare_platform_medicaldoctors.findFirstOrThrow({
      where: {
        id: props.medicalDoctorId,
        deleted_at: null,
      },
    });
  return {
    id: doctor.id,
    email: doctor.email,
    full_name: doctor.full_name,
    npi_number: doctor.npi_number,
    specialty: doctor.specialty ?? undefined,
    phone: doctor.phone ?? undefined,
    created_at: toISOStringSafe(doctor.created_at),
    updated_at: toISOStringSafe(doctor.updated_at),
    deleted_at: undefined,
  };
}
