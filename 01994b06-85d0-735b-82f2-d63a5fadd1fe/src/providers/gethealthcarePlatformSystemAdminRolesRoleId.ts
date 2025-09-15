import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRole";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Get details for a specific role entity by ID (healthcare_platform_roles
 * table).
 *
 * This endpoint allows a system administrator to retrieve all details of a
 * specific RBAC role entity by its unique identifier. It provides full metadata
 * as stored in the healthcare_platform_roles table, supporting compliance
 * workflows and platform governance.
 *
 * Only authenticated, authorized system administrators (systemAdmin) may access
 * this resource, as enforced by the API decorator and authentication provider.
 * Will throw a 404 error if the role does not exist.
 *
 * @param props - Object containing the authenticated systemAdmin and the roleId
 *   of the target role entity
 * @param props.systemAdmin - The authenticated system admin user (from
 *   SystemadminPayload)
 * @param props.roleId - The UUID identifier of the role entity to retrieve
 * @returns Full IHealthcarePlatformRole details for the specified role
 * @throws {Error} If role not found (Prisma throws)
 */
export async function gethealthcarePlatformSystemAdminRolesRoleId(props: {
  systemAdmin: SystemadminPayload;
  roleId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformRole> {
  const { roleId } = props;
  const role = await MyGlobal.prisma.healthcare_platform_roles.findFirstOrThrow(
    {
      where: { id: roleId },
      select: {
        id: true,
        code: true,
        name: true,
        scope_type: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    },
  );
  return {
    id: role.id,
    code: role.code,
    name: role.name,
    scope_type: role.scope_type,
    status: role.status,
    created_at: toISOStringSafe(role.created_at),
    updated_at: toISOStringSafe(role.updated_at),
    deleted_at:
      role.deleted_at !== undefined && role.deleted_at !== null
        ? toISOStringSafe(role.deleted_at)
        : role.deleted_at,
  };
}
