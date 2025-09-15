import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update an existing medical doctor profile by ID
 * (healthcare_platform_medicaldoctors).
 *
 * This endpoint allows an authenticated organization admin to update profile
 * details of an existing medical doctor, identified by unique UUID. Only
 * updatable fields—email, full_name, specialty, and phone—can be changed.
 * Immutable fields such as id, npi_number, created_at, and deleted_at are
 * protected and cannot be changed via this operation. Soft-deleted doctors
 * (deleted_at != null) are not found or updatable by this endpoint. All changes
 * are automatically tracked in audit trails and the updated_at field.
 *
 * If the record is not found or soft deleted, throws an error. On constraint
 * violations (such as duplicate email), a database error is surfaced by Prisma
 * and should be appropriately handled by the caller.
 *
 * @param props - Input props object
 * @param props.organizationAdmin - Authenticated organization admin user (from
 *   OrganizationadminAuth decorator)
 * @param props.medicalDoctorId - Target medical doctor's UUID to update
 * @param props.body - Update DTO containing only updatable profile fields
 * @returns The updated IHealthcarePlatformMedicalDoctor reflecting all changes
 * @throws {Error} When doctor is not found/soft-deleted or unique constraint
 *   fails
 */
export async function puthealthcarePlatformOrganizationAdminMedicaldoctorsMedicalDoctorId(props: {
  organizationAdmin: OrganizationadminPayload;
  medicalDoctorId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformMedicalDoctor.IUpdate;
}): Promise<IHealthcarePlatformMedicalDoctor> {
  const { organizationAdmin, medicalDoctorId, body } = props;

  // Step 1: Find the doctor by id, ensure not deleted
  const doctor =
    await MyGlobal.prisma.healthcare_platform_medicaldoctors.findFirst({
      where: {
        id: medicalDoctorId,
        deleted_at: null,
      },
    });
  if (!doctor) {
    throw new Error("Medical doctor not found or has been deleted.");
  }

  // Step 2: Update only allowed fields (immutable fields are never touched)
  const updateInput = {
    ...(body.email !== undefined ? { email: body.email } : {}),
    ...(body.full_name !== undefined ? { full_name: body.full_name } : {}),
    ...(body.specialty !== undefined ? { specialty: body.specialty } : {}),
    ...(body.phone !== undefined ? { phone: body.phone } : {}),
    updated_at: toISOStringSafe(new Date()),
  };

  const updated =
    await MyGlobal.prisma.healthcare_platform_medicaldoctors.update({
      where: { id: medicalDoctorId },
      data: updateInput,
    });

  return {
    id: updated.id,
    email: updated.email,
    full_name: updated.full_name,
    npi_number: updated.npi_number,
    specialty:
      updated.specialty === null ? null : (updated.specialty ?? undefined),
    phone: updated.phone === null ? null : (updated.phone ?? undefined),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
