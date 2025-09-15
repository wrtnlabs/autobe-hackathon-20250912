import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Permanently remove an unassigned RBAC role from the healthcarePlatform
 * system.
 *
 * This function hard deletes (permanently erases) an RBAC role, after verifying
 * that it is not currently referenced/used in any user assignments or
 * escalation/workflow business logic. Only system administrators may execute
 * this operation. Roles cannot be deleted if referenced in any assignments or
 * escalation events; such attempts will result in errors. Audit logs of
 * deletion may remain in other tables per compliance requirements.
 *
 * @param props - Properties for deletion
 * @param props.systemAdmin - The authenticated system administrator performing
 *   the operation
 * @param props.roleId - The UUID of the RBAC role to delete
 * @returns Void (nothing)
 * @throws {Error} If the role does not exist.
 * @throws {Error} If the role is assigned to any users or referenced by
 *   workflow/escalation business logic.
 */
export async function deletehealthcarePlatformSystemAdminRolesRoleId(props: {
  systemAdmin: SystemadminPayload;
  roleId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Verify the role exists
  const role = await MyGlobal.prisma.healthcare_platform_roles.findUnique({
    where: { id: props.roleId },
  });
  if (!role) {
    throw new Error("Role not found");
  }

  // Step 2: Check for any assignments using this role's code
  const userAssignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: { role_code: role.code },
    });
  if (userAssignment) {
    throw new Error(
      "Role cannot be deleted: it is assigned to one or more users",
    );
  }

  // Step 3: Check if any escalation event references this role id
  const referencedInEscalation =
    await MyGlobal.prisma.healthcare_platform_escalation_events.findFirst({
      where: { target_role_id: props.roleId },
    });
  if (referencedInEscalation) {
    throw new Error(
      "Role cannot be deleted: it is referenced by workflow or escalation logic",
    );
  }

  // Step 4: Hard delete the role (irreversible)
  await MyGlobal.prisma.healthcare_platform_roles.delete({
    where: { id: props.roleId },
  });
}
