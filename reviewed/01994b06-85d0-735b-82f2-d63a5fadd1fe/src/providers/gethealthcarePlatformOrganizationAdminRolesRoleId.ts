import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRole";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Get details for a specific role entity by ID (healthcare_platform_roles
 * table).
 *
 * Retrieves the complete details for a requested role, ensuring the role exists
 * and is active (not archived/deleted). Only accessible to authenticated
 * organization admins; will throw if the role does not exist or has been
 * archived. All fields are mapped according to the IHealthcarePlatformRole
 * structure, with ISO date strings for all timestamp fields.
 *
 * @param props - Parameters for the operation
 * @param props.organizationAdmin - The authenticated organization admin making
 *   the request
 * @param props.roleId - Globally unique identifier of the role to retrieve
 * @returns Complete details of the specified role entity
 * @throws {Error} When no matching role exists or the role has been archived
 */
export async function gethealthcarePlatformOrganizationAdminRolesRoleId(props: {
  organizationAdmin: OrganizationadminPayload;
  roleId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformRole> {
  const { roleId } = props;
  // Query for non-archived role with this id
  const role = await MyGlobal.prisma.healthcare_platform_roles.findFirst({
    where: {
      id: roleId,
      deleted_at: null,
    },
  });
  if (!role) {
    throw new Error("Role not found");
  }
  return {
    id: role.id,
    code: role.code,
    name: role.name,
    scope_type: role.scope_type,
    status: role.status,
    created_at: toISOStringSafe(role.created_at),
    updated_at: toISOStringSafe(role.updated_at),
    deleted_at: undefined, // role is active, deleted_at is null
  };
}
