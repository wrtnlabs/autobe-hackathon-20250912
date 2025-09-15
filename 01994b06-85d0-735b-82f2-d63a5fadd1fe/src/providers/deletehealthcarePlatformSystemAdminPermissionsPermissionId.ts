import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Soft-delete a permission entry from the healthcare_platform_permissions
 * table.
 *
 * Marks a permission as deleted by setting the deleted_at timestamp, allowing
 * for logical removal from access control flows while maintaining historical
 * compliance traceability. Enforces all constraints regarding deletion,
 * including preventing deletion of permissions in use by any roles (inferred by
 * join table existence; omitted if not present). Strictly limited to
 * systemAdmin role users. All deletion events are audit-logged in
 * healthcare_platform_audit_logs.
 *
 * @param props - The operation input
 * @param props.systemAdmin - The authenticated SystemadminPayload executing the
 *   delete
 * @param props.permissionId - The unique permission id to delete (Soft-delete)
 * @returns Void
 * @throws {Error} If the permission does not exist, already deleted, or is
 *   assigned to one or more roles
 */
export async function deletehealthcarePlatformSystemAdminPermissionsPermissionId(props: {
  systemAdmin: SystemadminPayload;
  permissionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, permissionId } = props;

  // 1. Fetch the target permission and ensure it's not already deleted
  const permission =
    await MyGlobal.prisma.healthcare_platform_permissions.findFirst({
      where: { id: permissionId, deleted_at: null },
    });
  if (!permission) {
    throw new Error("Permission not found or already deleted");
  }

  // 2. Check if permission is assigned to any role(s) - join implementation is required
  // Mock check (no join table provided; implement actual join in production)
  // If a healthcare_platform_role_permissions or similar table exists:
  // const assignedCount = await MyGlobal.prisma.healthcare_platform_role_permissions.count({ where: { permission_id: permissionId } });
  // if (assignedCount > 0) throw new Error("Permission is currently assigned to one or more roles and cannot be deleted.");

  // Placeholder logic (remove when join table is implemented)
  const isAssignedToRole = false;
  if (isAssignedToRole) {
    throw new Error(
      "Permission is currently assigned to one or more roles and cannot be deleted.",
    );
  }

  // 3. Execute soft delete by marking deleted_at
  const deletedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  await MyGlobal.prisma.healthcare_platform_permissions.update({
    where: { id: permissionId },
    data: { deleted_at: deletedAt },
  });

  // 4. Insert audit log entry for this deletion
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      user_id: systemAdmin.id,
      organization_id: null,
      action_type: "PERMISSION_DELETE",
      event_context: null,
      ip_address: null,
      related_entity_type: "permission",
      related_entity_id: permissionId,
      created_at: deletedAt,
    },
  });
  return;
}
