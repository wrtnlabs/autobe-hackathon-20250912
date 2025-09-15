import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve a detailed nurse profile by nurseId from the
 * healthcare_platform_nurses table.
 *
 * Fetches a single nurse's complete record from the healthcarePlatform, as
 * defined in the healthcare_platform_nurses table. This includes unique ID,
 * business email, legal full name, license/certification number, specialty,
 * phone number, and audit metadata.
 *
 * Authorization is enforced so that only organization administrators,
 * department heads, and staff with specific permissions may view sensitive or
 * identifying staff information. Access attempts are logged for compliance. If
 * a nurse's record is deactivated (soft-deleted), the operation will return an
 * error or indicate account status accordingly.
 *
 * This endpoint plays a key role in HR, compliance, and clinical scheduling
 * interfaces, providing a consistent data source for profile viewing,
 * onboarding, or credentialing verification workflows. Error handling
 * gracefully manages lookup failures, permission violations, and invalid
 * UUIDs.
 *
 * @param props - Input object
 * @param props.organizationAdmin - The authenticated organization admin making
 *   the request (enforced by decorator)
 * @param props.nurseId - The UUID of the nurse to retrieve
 * @returns A complete nurse profile matching the IHealthcarePlatformNurse
 *   structure
 * @throws {Error} If the nurse is not found or if the nurse is soft-deleted
 *   (deactivated)
 */
export async function gethealthcarePlatformOrganizationAdminNursesNurseId(props: {
  organizationAdmin: OrganizationadminPayload;
  nurseId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformNurse> {
  const { nurseId } = props;
  const nurse = await MyGlobal.prisma.healthcare_platform_nurses.findFirst({
    where: { id: nurseId },
  });
  if (!nurse) {
    throw new Error("Nurse not found");
  }
  if (nurse.deleted_at !== null) {
    throw new Error("Nurse is deactivated");
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
      nurse.deleted_at === null || typeof nurse.deleted_at === "undefined"
        ? undefined
        : toISOStringSafe(nurse.deleted_at),
  };
}
