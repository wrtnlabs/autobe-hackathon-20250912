import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsRolePermissions } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsRolePermissions";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Get detailed LMS role permission by ID
 *
 * This operation retrieves detailed information about a single LMS role
 * permission by its unique ID. It queries the enterprise_lms_role_permissions
 * table storing permission keys, descriptions, and allow flags attached to a
 * role.
 *
 * Requires authentication as organizationAdmin.
 *
 * @param props - Object containing organizationAdmin authentication payload and
 *   the ID of the role permission
 * @param props.organizationAdmin - Authenticated organization admin payload
 * @param props.id - Unique identifier of the role permission (UUID format)
 * @returns Detailed role permission information conforming to
 *   IEnterpriseLmsRolePermissions
 * @throws Error if no role permission is found with the specified ID
 */
export async function getenterpriseLmsOrganizationAdminRolePermissionsId(props: {
  organizationAdmin: OrganizationadminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsRolePermissions> {
  const record =
    await MyGlobal.prisma.enterprise_lms_role_permissions.findUniqueOrThrow({
      where: { id: props.id },
    });

  return {
    id: record.id,
    role_id: record.role_id,
    permission_key: record.permission_key,
    description: record.description ?? null,
    is_allowed: record.is_allowed,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
