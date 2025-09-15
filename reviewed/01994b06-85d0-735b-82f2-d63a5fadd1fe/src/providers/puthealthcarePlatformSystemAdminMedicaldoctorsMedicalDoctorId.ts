import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update an existing medical doctor profile by ID
 * (healthcare_platform_medicaldoctors).
 *
 * Updates the details of an existing medical doctor entity in the healthcare
 * platform by unique ID. Allows system administrators to update updatable
 * fields (excluding id and npi_number), enforces business logic around
 * immutability, email uniqueness, and audit. If the doctor does not exist or is
 * deleted, throws an error. All date fields are strictly handled as ISO
 * strings.
 *
 * @param props - The request payload
 *
 *   - SystemAdmin: The authenticated System Administrator (role: systemAdmin)
 *   - MedicalDoctorId: Unique identifier (UUID) of the medical doctor to update
 *   - Body: Fields to update (partial/complete) following DTO rules
 *
 * @returns The updated IHealthcarePlatformMedicalDoctor object
 * @throws {Error} If doctor not found, deleted, email duplicate, or forbidden
 *   field update attempted
 */
export async function puthealthcarePlatformSystemAdminMedicaldoctorsMedicalDoctorId(props: {
  systemAdmin: SystemadminPayload;
  medicalDoctorId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformMedicalDoctor.IUpdate;
}): Promise<IHealthcarePlatformMedicalDoctor> {
  const { systemAdmin, medicalDoctorId, body } = props;

  // Find active (non-deleted) doctor by ID
  const doctor =
    await MyGlobal.prisma.healthcare_platform_medicaldoctors.findFirst({
      where: { id: medicalDoctorId, deleted_at: null },
    });
  if (!doctor) {
    throw new Error("Medical doctor not found or has been deleted");
  }

  // Email uniqueness enforcement (exclude the current record)
  if (body.email !== undefined && body.email !== doctor.email) {
    const existing =
      await MyGlobal.prisma.healthcare_platform_medicaldoctors.findFirst({
        where: {
          email: body.email,
          deleted_at: null,
          id: { not: medicalDoctorId },
        },
      });
    if (existing) {
      throw new Error("Email address is already in use by another doctor");
    }
  }

  // Block npi_number update (immutable after creation)
  if (Object.prototype.hasOwnProperty.call(body, "npi_number")) {
    throw new Error("npi_number is immutable and cannot be updated");
  }

  // Prepare update data: only allowed, provided fields
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const updateData: Record<string, unknown> = {
    ...(body.email !== undefined && { email: body.email }),
    ...(body.full_name !== undefined && { full_name: body.full_name }),
    ...(body.specialty !== undefined && { specialty: body.specialty }),
    ...(body.phone !== undefined && { phone: body.phone }),
    updated_at: now,
  };

  // Update the doctor
  const updated =
    await MyGlobal.prisma.healthcare_platform_medicaldoctors.update({
      where: { id: medicalDoctorId },
      data: updateData,
    });

  // Return normalized DTO
  return {
    id: updated.id,
    email: updated.email,
    full_name: updated.full_name,
    npi_number: updated.npi_number,
    specialty:
      updated.specialty !== undefined && updated.specialty !== null
        ? updated.specialty
        : null,
    phone:
      updated.phone !== undefined && updated.phone !== null
        ? updated.phone
        : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== undefined && updated.deleted_at !== null
        ? toISOStringSafe(updated.deleted_at)
        : null,
  };
}
