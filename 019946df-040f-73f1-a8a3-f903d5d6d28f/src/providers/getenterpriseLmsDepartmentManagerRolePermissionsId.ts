import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsRolePermissions } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsRolePermissions";
import { DepartmentmanagerPayload } from "../decorators/payload/DepartmentmanagerPayload";

/**
 * Get detailed LMS role permission by ID
 *
 * Retrieves complete information about a single LMS role permission by its
 * unique ID. Only accessible by authenticated department managers. Throws an
 * error if the role permission is not found.
 *
 * @param props - Request props including authentication and role permission ID
 * @param props.departmentManager - Authenticated department manager payload
 * @param props.id - Unique identifier of the role permission
 * @returns Role permission details conforming to IEnterpriseLmsRolePermissions
 * @throws {Error} When the specified role permission ID does not exist
 */
export async function getenterpriseLmsDepartmentManagerRolePermissionsId(props: {
  departmentManager: DepartmentmanagerPayload;
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
