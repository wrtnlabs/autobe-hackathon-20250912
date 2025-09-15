import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Permanently remove a System Admin account from healthcarePlatform.
 *
 * This endpoint irreversibly and permanently deletes a system administrator
 * account from the healthcare_platform_systemadmins table. Validates that the
 * requesting System Admin is not deleting themselves, the target exists and is
 * active (not deleted), and at least one other system admin remains
 * post-deletion. All organization assignments for the target user are removed
 * for referential integrity, and the event is logged in the audit trail. The
 * operation is atomic within a database transaction and cannot be undone.
 * Errors are thrown for invalid actions or if business rules are violated.
 *
 * @param props - SystemAdmin: payload for the authenticated systemAdmin (from
 *   SystemadminAuth) systemAdminId: UUID of the system admin to permanently
 *   delete
 * @returns Void
 * @throws {Error} When acting admin tries to delete themselves
 * @throws {Error} When target admin doesn't exist or is already deleted
 * @throws {Error} When trying to delete the only remaining system admin
 */
export async function deletehealthcarePlatformSystemAdminSystemadminsSystemAdminId(props: {
  systemAdmin: SystemadminPayload;
  systemAdminId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, systemAdminId } = props;

  if (systemAdmin.id === systemAdminId) {
    throw new Error("System admin cannot delete themselves.");
  }

  // Use a transaction to ensure atomicity
  await MyGlobal.prisma.$transaction(async (prisma) => {
    const target = await prisma.healthcare_platform_systemadmins.findFirst({
      where: {
        id: systemAdminId,
        deleted_at: null,
      },
    });
    if (!target) {
      throw new Error("System admin not found or already deleted.");
    }

    const adminCount = await prisma.healthcare_platform_systemadmins.count({
      where: { deleted_at: null },
    });
    if (adminCount <= 1) {
      throw new Error(
        "At least one system admin must remain. Cannot delete the last remaining system admin.",
      );
    }

    await prisma.healthcare_platform_user_org_assignments.deleteMany({
      where: { user_id: systemAdminId },
    });

    await prisma.healthcare_platform_audit_logs.create({
      data: {
        id: v4(),
        user_id: systemAdmin.id,
        organization_id: null,
        action_type: "SYSTEMADMIN_DELETE",
        event_context: `Deleted system admin account ${systemAdminId}`,
        ip_address: null,
        related_entity_type: "systemadmin_account",
        related_entity_id: systemAdminId,
        created_at: toISOStringSafe(new Date()),
      },
    });

    await prisma.healthcare_platform_systemadmins.delete({
      where: { id: systemAdminId },
    });
  });
}
