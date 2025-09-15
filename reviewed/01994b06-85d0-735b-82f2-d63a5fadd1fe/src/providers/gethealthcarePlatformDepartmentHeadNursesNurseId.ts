import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Retrieve a detailed nurse profile by nurseId from the
 * healthcare_platform_nurses table.
 *
 * Fetches a single nurse's complete record from the healthcarePlatform. This
 * includes unique ID, business email, legal full name, license/certification
 * number, specialty, phone number, and audit metadata. Authorization is
 * enforced for department head access context. If the nurse is not found or is
 * deactivated (soft-deleted), an error is thrown.
 *
 * @param props - Object containing departmentHead authentication and the target
 *   nurseId
 * @param props.departmentHead - The authenticated DepartmentheadPayload (must
 *   already be validated before calling)
 * @param props.nurseId - The UUID of the nurse to retrieve
 * @returns The full IHealthcarePlatformNurse record, or throws error if not
 *   found or not permitted
 * @throws {Error} If the nurse does not exist or is deactivated (soft deleted)
 */
export async function gethealthcarePlatformDepartmentHeadNursesNurseId(props: {
  departmentHead: DepartmentheadPayload;
  nurseId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformNurse> {
  const nurse = await MyGlobal.prisma.healthcare_platform_nurses.findFirst({
    where: {
      id: props.nurseId,
      deleted_at: null,
    },
  });
  if (!nurse) {
    throw new Error("Nurse not found or deactivated");
  }
  return {
    id: nurse.id,
    email: nurse.email,
    full_name: nurse.full_name,
    license_number: nurse.license_number,
    specialty: nurse.specialty ?? undefined,
    phone: nurse.phone ?? undefined,
    created_at: toISOStringSafe(nurse.created_at),
    updated_at: toISOStringSafe(nurse.updated_at),
    deleted_at:
      nurse.deleted_at !== undefined && nurse.deleted_at !== null
        ? toISOStringSafe(nurse.deleted_at)
        : undefined,
  };
}
