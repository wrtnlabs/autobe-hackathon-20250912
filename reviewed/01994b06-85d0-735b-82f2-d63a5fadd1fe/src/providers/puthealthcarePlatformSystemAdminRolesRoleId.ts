import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRole";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update an existing RBAC role's display name, status, or description.
 *
 * This operation updates the display name, operational status, or other
 * editable properties of an existing RBAC role within the healthcarePlatform
 * system. Only fields 'name' and 'status' are editable by design, and all
 * updates are authorized exclusively for Systemadmin users.
 *
 * Security: Only authenticated Systemadmin users may update roles. Attempts to
 * update role codes or scope_type are blocked by business logic and type
 * design. Any attempt to update a non-existent role results in a 404 error.
 *
 * @param props - Object containing:
 *
 *   - SystemAdmin: SystemadminPayload (authenticated admin)
 *   - RoleId: string & tags.Format<'uuid'> (target role's UUID)
 *   - Body: IHealthcarePlatformRole.IUpdate (fields to update, only name/status
 *       allowed)
 *
 * @returns IHealthcarePlatformRole - The updated role object reflecting all
 *   changes
 * @throws {Error} 404 if roleId does not reference an existing role
 */
export async function puthealthcarePlatformSystemAdminRolesRoleId(props: {
  systemAdmin: SystemadminPayload;
  roleId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformRole.IUpdate;
}): Promise<IHealthcarePlatformRole> {
  const { systemAdmin, roleId, body } = props;

  // Step 1: Check that the role exists (404 if not found)
  const existing = await MyGlobal.prisma.healthcare_platform_roles.findUnique({
    where: { id: roleId },
  });
  if (!existing) {
    throw new Error("Role not found");
  }

  // Step 2: Prepare update data; only update name/status if provided, always update updated_at
  const updateData: {
    name?: string;
    status?: string;
    updated_at: string & tags.Format<"date-time">;
  } = {
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.status !== undefined ? { status: body.status } : {}),
    updated_at: toISOStringSafe(new Date()),
  };

  // Step 3: Update the role
  const updated = await MyGlobal.prisma.healthcare_platform_roles.update({
    where: { id: roleId },
    data: updateData,
  });

  // Step 4: Return the updated role, mapping all Date to ISO string formats
  return {
    id: updated.id,
    code: updated.code,
    name: updated.name,
    scope_type: updated.scope_type,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
