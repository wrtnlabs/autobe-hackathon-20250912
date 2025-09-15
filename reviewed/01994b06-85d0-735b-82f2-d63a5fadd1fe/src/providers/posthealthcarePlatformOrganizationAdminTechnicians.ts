import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTechnician";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new technician record in healthcare_platform_technicians.
 *
 * This operation allows an authenticated organization admin to onboard a new
 * clinical technician (e.g., radiology/lab) staff profile to the healthcare
 * platform. Inputs must have unique business email and license; optional
 * specialty and phone are permitted. If duplicate email or license_number is
 * found, an error is thrown. Dates are always stored as ISO 8601 strings.
 *
 * @param props - Parameters for technician onboarding
 * @param props.organizationAdmin - Payload for the authenticated organization
 *   admin (authorization checked at controller layer)
 * @param props.body - The technician creation data (business email, full legal
 *   name, license, optional specialty and phone)
 * @returns The newly created technician's database record
 * @throws {Error} If the provided email or license_number already exists
 */
export async function posthealthcarePlatformOrganizationAdminTechnicians(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformTechnician.ICreate;
}): Promise<IHealthcarePlatformTechnician> {
  const { body } = props;

  // 1. Uniqueness checks: email
  const existingByEmail =
    await MyGlobal.prisma.healthcare_platform_technicians.findFirst({
      where: {
        email: body.email,
      },
    });
  if (existingByEmail) {
    throw new Error("Technician email is already in use");
  }

  // 2. Uniqueness checks: license_number
  const existingByLicense =
    await MyGlobal.prisma.healthcare_platform_technicians.findFirst({
      where: {
        license_number: body.license_number,
      },
    });
  if (existingByLicense) {
    throw new Error("Technician license_number is already in use");
  }

  // 3. Generate id and timestamps
  const now = toISOStringSafe(new Date());

  // 4. Create new technician
  const technician =
    await MyGlobal.prisma.healthcare_platform_technicians.create({
      data: {
        id: v4(),
        email: body.email,
        full_name: body.full_name,
        license_number: body.license_number,
        specialty: body.specialty ?? undefined,
        phone: body.phone ?? undefined,
        created_at: now,
        updated_at: now,
      },
    });

  // 5. Return result in API/DTO structure
  return {
    id: technician.id,
    email: technician.email,
    full_name: technician.full_name,
    license_number: technician.license_number,
    specialty: technician.specialty ?? undefined,
    phone: technician.phone ?? undefined,
    created_at: toISOStringSafe(technician.created_at),
    updated_at: toISOStringSafe(technician.updated_at),
    deleted_at:
      technician.deleted_at != null
        ? toISOStringSafe(technician.deleted_at)
        : undefined,
  };
}
