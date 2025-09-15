import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Update nurse staff member profile information in healthcare_platform_nurses
 * by nurseId.
 *
 * Enables authorized departmentHead to modify nurse fields including email,
 * full_name, license_number, specialty, or phone. All updates are soft-checked
 * for nurse presence (not deleted), and updated_at is set for audit. Returns
 * the updated nurse profile.
 *
 * Authorization checks are upstream; function errors if nurse is not found or
 * already deleted.
 *
 * @param props - Update request: departmentHead payload, nurseId, update
 *   payload
 * @param props.departmentHead - DepartmentheadPayload JWT (authorization
 *   checked via decorator)
 * @param props.nurseId - The UUID of the nurse to update
 * @param props.body - Fields to update (email, full_name, license_number,
 *   specialty, phone)
 * @returns The updated nurse profile as IHealthcarePlatformNurse
 * @throws {Error} If the nurse does not exist or is deleted
 */
export async function puthealthcarePlatformDepartmentHeadNursesNurseId(props: {
  departmentHead: DepartmentheadPayload;
  nurseId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformNurse.IUpdate;
}): Promise<IHealthcarePlatformNurse> {
  const { nurseId, body } = props;

  // Check nurse exists & is not deleted
  const nurse = await MyGlobal.prisma.healthcare_platform_nurses.findFirst({
    where: { id: nurseId, deleted_at: null },
  });
  if (!nurse) throw new Error("Nurse not found or already deleted");

  // Only update provided fields, always update updated_at
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.healthcare_platform_nurses.update({
    where: { id: nurseId },
    data: {
      ...(body.email !== undefined && { email: body.email }),
      ...(body.full_name !== undefined && { full_name: body.full_name }),
      ...(body.license_number !== undefined && {
        license_number: body.license_number,
      }),
      // Specialty, phone can be nullified
      ...(body.specialty !== undefined && { specialty: body.specialty }),
      ...(body.phone !== undefined && { phone: body.phone }),
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    full_name: updated.full_name,
    license_number: updated.license_number,
    specialty: updated.specialty ?? undefined,
    phone: updated.phone ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    // Only include deleted_at if non-null
    ...(updated.deleted_at !== undefined
      ? {
          deleted_at: updated.deleted_at
            ? toISOStringSafe(updated.deleted_at)
            : null,
        }
      : {}),
  };
}
