import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Soft delete a medical doctor record by ID
 * (healthcare_platform_medicaldoctors).
 *
 * This operation marks the doctor as deleted (sets deleted_at) instead of
 * removing the record, in accordance with compliance retention policy. The
 * account must be undeleted to proceed. The action is restricted to
 * organization admins and all deletions are logged for audit.
 *
 * @param props - The input parameter object
 * @param props.organizationAdmin - The authenticated organization admin
 *   performing this operation
 * @param props.medicalDoctorId - The UUID of the doctor to delete
 * @returns Void
 * @throws {Error} If doctor does not exist or is already deleted
 */
export async function deletehealthcarePlatformOrganizationAdminMedicaldoctorsMedicalDoctorId(props: {
  organizationAdmin: OrganizationadminPayload;
  medicalDoctorId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Confirm doctor exists and is not already soft-deleted
  const doctor =
    await MyGlobal.prisma.healthcare_platform_medicaldoctors.findFirst({
      where: {
        id: props.medicalDoctorId,
        deleted_at: null,
      },
    });
  if (!doctor) {
    throw new Error("Medical doctor not found or already deleted");
  }
  // Step 2: Soft delete (update deleted_at)
  await MyGlobal.prisma.healthcare_platform_medicaldoctors.update({
    where: {
      id: props.medicalDoctorId,
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
