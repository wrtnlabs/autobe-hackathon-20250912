import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPermission";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve a specific permission definition from the
 * healthcare_platform_permissions table.
 *
 * This endpoint allows system administrators to retrieve detailed information
 * about a permission used in the platform's RBAC system. Access is strictly
 * limited to authorized system admins and will not expose archived
 * (soft-deleted) permissions.
 *
 * @param props - Object containing the authenticated Systemadmin payload and
 *   the permissionId to retrieve.
 * @param props.systemAdmin - The authenticated system administrator's JWT
 *   payload (already validated via decorator/middleware).
 * @param props.permissionId - The unique UUID identifying the permission to
 *   fetch.
 * @returns Detailed permission information if the permission is found and
 *   active.
 * @throws {Error} If the permission is not found (does not exist or is
 *   archived).
 */
export async function gethealthcarePlatformSystemAdminPermissionsPermissionId(props: {
  systemAdmin: SystemadminPayload;
  permissionId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformPermission> {
  const { permissionId } = props;

  const permission =
    await MyGlobal.prisma.healthcare_platform_permissions.findFirst({
      where: {
        id: permissionId,
        deleted_at: null,
      },
    });

  if (!permission) {
    throw new Error("Permission not found");
  }

  return {
    id: permission.id,
    code: permission.code,
    name: permission.name,
    description: permission.description,
    scope_type: permission.scope_type,
    status: permission.status,
    created_at: toISOStringSafe(permission.created_at),
    updated_at: toISOStringSafe(permission.updated_at),
    deleted_at: permission.deleted_at
      ? toISOStringSafe(permission.deleted_at)
      : undefined,
  };
}
