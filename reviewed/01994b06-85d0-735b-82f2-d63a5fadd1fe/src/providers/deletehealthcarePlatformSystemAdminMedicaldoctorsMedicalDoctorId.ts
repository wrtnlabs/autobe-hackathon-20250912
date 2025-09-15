import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Soft delete a medical doctor record by ID
 * (healthcare_platform_medicaldoctors).
 *
 * This operation marks the specified medical doctor as deleted by setting the
 * deleted_at field (soft delete), ensuring the record is excluded from routine
 * queries but retained for compliance, audit, and restoration. If the medical
 * doctor does not exist or is already deleted, an error is thrown (idempotent
 * error).
 *
 * Requires authorization as system admin via SystemadminPayload.
 *
 * @param props - Object containing required properties for operation
 * @param props.systemAdmin - The authenticated system admin user (must have
 *   type: "systemAdmin")
 * @param props.medicalDoctorId - The unique identifier (UUID) of the medical
 *   doctor to delete
 * @returns Void
 * @throws {Error} If the medical doctor is not found or already deleted
 */
export async function deletehealthcarePlatformSystemAdminMedicaldoctorsMedicalDoctorId(props: {
  systemAdmin: SystemadminPayload;
  medicalDoctorId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, medicalDoctorId } = props;

  // Find the target doctor and ensure not already soft deleted
  const doctor =
    await MyGlobal.prisma.healthcare_platform_medicaldoctors.findFirst({
      where: {
        id: medicalDoctorId,
        deleted_at: null,
      },
    });
  if (!doctor) {
    throw new Error("Medical doctor not found or already deleted");
  }

  // Mark as soft deleted: set deleted_at (ISO) and updated_at
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.healthcare_platform_medicaldoctors.update({
    where: { id: medicalDoctorId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
