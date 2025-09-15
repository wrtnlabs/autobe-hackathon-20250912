import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Soft delete (archive) a nurse record in healthcare_platform_nurses by ID.
 *
 * This endpoint enables a privileged system administrator to logically (soft)
 * delete a nurse record by marking the 'deleted_at' field. No physical deletion
 * is performed—soft deletion respects compliance/audit rules, allowing
 * retention for future review or restoration if needed.
 *
 * Only system admins (SystemadminPayload) may perform this action. An error is
 * thrown if the nurse does not exist or is already deleted. The deleted_at
 * timestamp is set using a safe ISO 8601 string. All business logic and access
 * control is handled within this function in a functional, immutable,
 * production-safe style without native Date type or type assertions.
 *
 * @param props - Object containing a valid system admin payload and the nurseId
 *   (UUID) for the nurse to delete
 * @param props.systemAdmin - Authenticated system admin performing the
 *   operation
 * @param props.nurseId - Unique nurse ID (UUID format) to be soft deleted
 * @returns Void
 * @throws {Error} When the specified nurse does not exist or is already
 *   deleted; authorization handled by decorator
 */
export async function deletehealthcarePlatformSystemAdminNursesNurseId(props: {
  systemAdmin: SystemadminPayload;
  nurseId: string & tags.Format<"uuid">;
}): Promise<void> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Ensure nurse exists and is not already deleted
  const nurse = await MyGlobal.prisma.healthcare_platform_nurses.findFirst({
    where: {
      id: props.nurseId,
      deleted_at: null,
    },
  });
  if (nurse == null) {
    throw new Error("Nurse not found or already deleted");
  }

  // Soft-delete the nurse by marking deleted_at
  await MyGlobal.prisma.healthcare_platform_nurses.update({
    where: {
      id: props.nurseId,
    },
    data: {
      deleted_at: now,
    },
  });
}
