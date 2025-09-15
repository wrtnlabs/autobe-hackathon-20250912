import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Permanently removes (soft-deletes) a technician from
 * healthcare_platform_technicians.
 *
 * Soft deletion updates the 'deleted_at' field as an ISO8601 string timestamp,
 * preserving the record for compliance/audit. Only systemAdmin or similar
 * privileged users are permitted this action. Attempts to delete a non-existent
 * or already-deleted technician will throw an error.
 *
 * This operation is irreversible and affects downstream assignments/scheduling.
 *
 * @param props - Operation parameters
 * @param props.systemAdmin - Authenticated system admin performing the
 *   operation (payload: SystemadminPayload)
 * @param props.technicianId - The unique technician ID to remove
 * @returns Void
 * @throws {Error} If the technician does not exist or is already deleted.
 * @throws {Error} If the admin user is not present or already deleted (should
 *   not normally occur if decorator works).
 */
export async function deletehealthcarePlatformSystemAdminTechniciansTechnicianId(props: {
  systemAdmin: SystemadminPayload;
  technicianId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Defensive admin existence check (decorator covers this, but enforced per policy)
  const admin =
    await MyGlobal.prisma.healthcare_platform_systemadmins.findFirst({
      where: { id: props.systemAdmin.id, deleted_at: null },
    });
  if (!admin) {
    throw new Error("Admin not found or deleted");
  }

  // Find technician that is not already deleted
  const technician =
    await MyGlobal.prisma.healthcare_platform_technicians.findFirst({
      where: { id: props.technicianId, deleted_at: null },
    });
  if (!technician) {
    throw new Error("Technician not found or already deleted");
  }

  // Soft delete technician (never use native Date; always use toISOStringSafe)
  await MyGlobal.prisma.healthcare_platform_technicians.update({
    where: { id: props.technicianId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
  // Return void explicitly
  return;
}
