import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new medical doctor record (healthcare_platform_medicaldoctors).
 *
 * Creates a new medical doctor profile and adds them to the healthcare
 * platform. Consumers must supply all mandatory fields as defined by the
 * healthcare_platform_medicaldoctors table, such as email, full name, NPI
 * number, and other professional details. On successful creation, the provider
 * record will be accessible for further assignment to departments, clinical
 * scheduling, or license validation.
 *
 * Only authorized users (system admins or organization admins) can execute this
 * operation. The input request is validated for uniqueness constraints (email,
 * NPI number) and field formats. Business logic may trigger credential
 * verification and onboarding workflows as part of post-processing.
 *
 * Related API operations include updating a doctor's profile, assigning
 * provider to organizations/departments, or starting credential validation
 * sequences. All creation actions are fully audited.
 *
 * @param props - Object containing system admin payload and new doctor body
 * @param props.systemAdmin - SystemadminPayload (authenticated system admin)
 * @param props.body - IHealthcarePlatformMedicalDoctor.ICreate (doctor creation
 *   fields)
 * @returns Newly created IHealthcarePlatformMedicalDoctor record (with id,
 *   metadata, and created/updated timestamps)
 * @throws {Error} When doctor with same email or npi_number already exists
 */
export async function posthealthcarePlatformSystemAdminMedicaldoctors(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformMedicalDoctor.ICreate;
}): Promise<IHealthcarePlatformMedicalDoctor> {
  // Get current timestamp in correct format
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Enforce uniqueness: no doctor may share email or npi_number (even if soft-deleted)
  const duplicate =
    await MyGlobal.prisma.healthcare_platform_medicaldoctors.findFirst({
      where: {
        OR: [
          { email: props.body.email },
          { npi_number: props.body.npi_number },
        ],
      },
    });
  if (duplicate !== null) {
    throw new Error(
      "A medical doctor with that email or NPI number already exists.",
    );
  }

  // Generate new UUID for doctor
  const doctorId: string & tags.Format<"uuid"> = v4();

  // Create doctor record
  const created =
    await MyGlobal.prisma.healthcare_platform_medicaldoctors.create({
      data: {
        id: doctorId,
        email: props.body.email,
        full_name: props.body.full_name,
        npi_number: props.body.npi_number,
        specialty: props.body.specialty ?? null,
        phone: props.body.phone ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  // Map all fields as per DTO — handle null/undefined strictly
  return {
    id: created.id,
    email: created.email,
    full_name: created.full_name,
    npi_number: created.npi_number,
    specialty: created.specialty ?? null,
    phone: created.phone ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== undefined && created.deleted_at !== null
        ? toISOStringSafe(created.deleted_at)
        : null,
  };
}
