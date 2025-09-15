import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new medical doctor record (healthcare_platform_medicaldoctors).
 *
 * This operation creates a new medical doctor entity within the healthcare
 * platform. Organization admins can onboard new doctors by supplying all
 * required credential and contact fields. Uniqueness of email and NPI number is
 * enforced with early error checks before insertion. Outputs the full created
 * doctor profile including identifier and timestamps. Field types strictly
 * follow DTO rules.
 *
 * Only authenticated organization admins may perform this operation.
 *
 * @param props - Method props containing the organization administrator's
 *   authenticated payload and request body.
 * @param props.organizationAdmin - The authenticated OrganizationadminPayload
 *   (must be organization admin).
 * @param props.body - The doctor creation input (email, full name, NPI,
 *   specialty, phone).
 * @returns The created medical doctor profile with platform-unique ID and audit
 *   metadata.
 * @throws {Error} When the email or NPI number is already in use by another
 *   doctor.
 */
export async function posthealthcarePlatformOrganizationAdminMedicaldoctors(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformMedicalDoctor.ICreate;
}): Promise<IHealthcarePlatformMedicalDoctor> {
  const { body } = props;

  // Enforce uniqueness for email
  const existingEmail =
    await MyGlobal.prisma.healthcare_platform_medicaldoctors.findFirst({
      where: { email: body.email },
      select: { id: true },
    });
  if (existingEmail) {
    throw new Error("A medical doctor with this email already exists.");
  }

  // Enforce uniqueness for npi_number
  const existingNpi =
    await MyGlobal.prisma.healthcare_platform_medicaldoctors.findFirst({
      where: { npi_number: body.npi_number },
      select: { id: true },
    });
  if (existingNpi) {
    throw new Error("A medical doctor with this NPI number already exists.");
  }

  // Create the doctor with generated UUID and ISO datetime strings
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.healthcare_platform_medicaldoctors.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        email: body.email,
        full_name: body.full_name,
        npi_number: body.npi_number,
        specialty:
          typeof body.specialty === "undefined" ? undefined : body.specialty,
        phone: typeof body.phone === "undefined" ? undefined : body.phone,
        created_at: now,
        updated_at: now,
        // deleted_at omitted from create, remains null
      },
    });

  return {
    id: created.id,
    email: created.email,
    full_name: created.full_name,
    npi_number: created.npi_number,
    specialty:
      typeof created.specialty === "undefined" ? undefined : created.specialty,
    phone: typeof created.phone === "undefined" ? undefined : created.phone,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      typeof created.deleted_at === "undefined" || created.deleted_at === null
        ? undefined
        : toISOStringSafe(created.deleted_at),
  };
}
