import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsRolePermissions } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsRolePermissions";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Get detailed LMS role permission by ID
 *
 * This operation retrieves detailed information about a single LMS role
 * permission by its unique ID. It requires an authenticated system admin user.
 *
 * @param props - Object containing the system admin payload and the role
 *   permission ID
 * @param props.systemAdmin - The authenticated system administrator payload
 * @param props.id - The UUID of the role permission to retrieve
 * @returns The detailed LMS role permission information
 * @throws {Error} If the role permission with specified ID does not exist
 */
export async function getenterpriseLmsSystemAdminRolePermissionsId(props: {
  systemAdmin: SystemadminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsRolePermissions> {
  const { id } = props;

  const rolePermission =
    await MyGlobal.prisma.enterprise_lms_role_permissions.findUniqueOrThrow({
      where: { id },
    });

  return {
    id: rolePermission.id,
    role_id: rolePermission.role_id,
    permission_key: rolePermission.permission_key,
    description: rolePermission.description ?? null,
    is_allowed: rolePermission.is_allowed,
    created_at: toISOStringSafe(rolePermission.created_at),
    updated_at: toISOStringSafe(rolePermission.updated_at),
  };
}
