import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Deletes a system administrator account by systemAdminId from
 * ats_recruitment_systemadmins table.
 *
 * This operation performs a soft delete by setting the deleted_at timestamp,
 * maintaining audit compliance. It ensures that at least one active system
 * admin remains in the system at all times. Only authenticated and active
 * admins can perform this action. Every deletion event is recorded in the audit
 * trail for compliance and forensic reasons.
 *
 * @param props - Object containing SystemadminPayload and the systemAdminId of
 *   the target to delete
 * @param props.systemAdmin - The authenticated systemadmin performing the
 *   deletion
 * @param props.systemAdminId - The UUID of the admin account to delete
 * @returns Void
 * @throws {Error} When attempting to delete a non-existent/soft-deleted admin,
 *   delete the last admin, or on DB failure.
 */
export async function deleteatsRecruitmentSystemAdminSystemAdminsSystemAdminId(props: {
  systemAdmin: SystemadminPayload;
  systemAdminId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Retrieve the admin to be deleted and check existence (must not be soft-deleted)
  const admin = await MyGlobal.prisma.ats_recruitment_systemadmins.findFirst({
    where: {
      id: props.systemAdminId,
      deleted_at: null,
    },
  });
  if (!admin) {
    throw new Error("Administrator not found or already deleted");
  }

  // Step 2: Ensure at least one non-deleted, active admin remains after deletion
  const activeAdmins = await MyGlobal.prisma.ats_recruitment_systemadmins.count(
    {
      where: {
        deleted_at: null,
        is_active: true,
      },
    },
  );
  if (activeAdmins <= 1) {
    throw new Error(
      "Cannot delete the last remaining system administrator. At least one administrator must remain.",
    );
  }

  // Step 3: Perform soft delete by updating deleted_at
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.ats_recruitment_systemadmins.update({
    where: { id: props.systemAdminId },
    data: { deleted_at: now },
  });

  // Step 4: Log the operation in the audit trail
  await MyGlobal.prisma.ats_recruitment_audit_trails.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      event_timestamp: now,
      actor_id: props.systemAdmin.id,
      actor_role: "systemadmin",
      operation_type: "DELETE",
      target_type: "systemadmin",
      target_id: props.systemAdminId,
      event_detail: `Systemadmin account ${props.systemAdminId} deleted by ${props.systemAdmin.id}`,
      ip_address: undefined,
      user_agent: undefined,
      created_at: now,
      updated_at: now,
      deleted_at: undefined,
    },
  });
}
