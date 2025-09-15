import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPermission";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update an existing permission entry in the healthcare_platform_permissions
 * table.
 *
 * This operation allows system administrators to update the definition of a
 * specific RBAC permission. Only the fields name, description, status, and the
 * soft-delete (deleted_at) marker can be modified; attempts to change code or
 * scope_type will be rejected. Returns the updated permission object. All
 * updates are restricted to active permissions and authorized system
 * administrators. Soft-deleted permissions cannot be updated. Uniqueness of
 * (code, scope_type) is enforced.
 *
 * @param props - Operation input
 * @param props.systemAdmin - Authenticated system administrator
 *   (SystemadminPayload)
 * @param props.permissionId - UUID of the permission to update
 * @param props.body - Update payload (only allowed fields: name, description,
 *   status, deleted_at)
 * @returns The updated permission object
 * @throws {Error} If permission does not exist, is soft deleted, attempts to
 *   update code/scope_type, or violates unique constraint
 */
export async function puthealthcarePlatformSystemAdminPermissionsPermissionId(props: {
  systemAdmin: SystemadminPayload;
  permissionId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformPermission.IUpdate;
}): Promise<IHealthcarePlatformPermission> {
  const { permissionId, body } = props;

  // 1. Fetch the existing permission (must not be soft deleted)
  const existing =
    await MyGlobal.prisma.healthcare_platform_permissions.findFirst({
      where: { id: permissionId, deleted_at: null },
    });
  if (!existing) {
    throw new Error("Permission not found or has been soft deleted");
  }

  // 2. Do not allow updating 'code' or 'scope_type' via this endpoint
  if (body.code !== undefined || body.scope_type !== undefined) {
    throw new Error("Updating 'code' or 'scope_type' is not allowed");
  }

  // 3. Construct update payload for allowed fields only
  //   - Prisma: undefined skips update; null sets null (for deleted_at)
  const updatePayload = {
    name: body.name ?? undefined,
    description: body.description ?? undefined,
    status: body.status ?? undefined,
    deleted_at: body.deleted_at ?? undefined,
  };

  let updated;
  try {
    updated = await MyGlobal.prisma.healthcare_platform_permissions.update({
      where: { id: permissionId },
      data: updatePayload,
    });
  } catch (err) {
    // Surface uniqueness or generic DB errors with context
    throw new Error(
      err instanceof Error && typeof err.message === "string"
        ? err.message
        : "Failed to update permission",
    );
  }

  // 4. TODO: Write audit log entry after successful update (type/scheme not defined)
  // (If a compliant IAuditLog or similar type/model appears, implement audit here)

  // 5. Return the updated permission as DTO-compliant object
  return {
    id: updated.id,
    code: updated.code,
    name: updated.name,
    description: updated.description,
    scope_type: updated.scope_type,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : (updated.deleted_at ?? undefined),
  };
}
