import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update nurse staff member profile information in healthcare_platform_nurses
 * by nurseId.
 *
 * This endpoint lets an authorized organizationAdmin update the profile of a
 * nurse staff member, such as email, full name, license number, specialty, or
 * phone. It enforces uniqueness for email and license_number, prohibits changes
 * to immutable fields, and prevents updates to deleted/inactive nurses. All
 * datetime fields are converted to string (date-time) format. Errors are thrown
 * if business or uniqueness rules are violated.
 *
 * @param props - The update request
 * @param props.organizationAdmin - The authenticated admin (injected by
 *   middleware)
 * @param props.nurseId - UUID of the nurse to update
 * @param props.body - Partial nurse update data (email, full_name,
 *   license_number, specialty, phone)
 * @returns The updated nurse profile with all current field values
 * @throws {Error} If nurse not found, soft-deleted, or update violates
 *   uniqueness constraints
 */
export async function puthealthcarePlatformOrganizationAdminNursesNurseId(props: {
  organizationAdmin: OrganizationadminPayload;
  nurseId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformNurse.IUpdate;
}): Promise<IHealthcarePlatformNurse> {
  const { nurseId, body } = props;
  // 1. Retrieve nurse by nurseId (must not be soft-deleted)
  const nurse = await MyGlobal.prisma.healthcare_platform_nurses.findFirst({
    where: {
      id: nurseId,
      deleted_at: null,
    },
  });
  if (!nurse) {
    throw new Error("Nurse not found or is deactivated");
  }

  // 2. Check for duplicate email (if email is being changed)
  if (body.email !== undefined) {
    const conflict = await MyGlobal.prisma.healthcare_platform_nurses.findFirst(
      {
        where: {
          email: body.email,
          id: { not: nurseId },
          deleted_at: null,
        },
      },
    );
    if (conflict) {
      throw new Error("Duplicate email: another nurse with this email exists");
    }
  }

  // 3. Check for duplicate license_number (if license_number is being changed)
  if (body.license_number !== undefined) {
    const conflict = await MyGlobal.prisma.healthcare_platform_nurses.findFirst(
      {
        where: {
          license_number: body.license_number,
          id: { not: nurseId },
          deleted_at: null,
        },
      },
    );
    if (conflict) {
      throw new Error(
        "Duplicate license number: another nurse with this license exists",
      );
    }
  }

  // 4. Build update object with only allowed fields
  const updateInput = {
    email: body.email ?? undefined,
    full_name: body.full_name ?? undefined,
    license_number: body.license_number ?? undefined,
    specialty: body.specialty ?? undefined,
    phone: body.phone ?? undefined,
    updated_at: toISOStringSafe(new Date()),
  };

  const updated = await MyGlobal.prisma.healthcare_platform_nurses.update({
    where: { id: nurseId },
    data: updateInput,
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
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
