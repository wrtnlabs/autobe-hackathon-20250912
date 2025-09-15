import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPermission";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new permission entry in the healthcare_platform_permissions table.
 *
 * This endpoint allows a system administrator to create a new RBAC permission
 * definition in the system database. It requires all key details (code, name,
 * description, scope_type, status) and enforces uniqueness on the (code,
 * scope_type) pair (among active permissions). On success returns the newly
 * created permission in canonical form as IHealthcarePlatformPermission.
 *
 * Uniqueness and soft-deletion are enforced according to business and schema
 * rules (deleted_at null on active). Authorization is strictly restricted to
 * authenticated systemAdmin users.
 *
 * @param props - Request props object
 * @param props.systemAdmin - The authenticated system administrator payload
 * @param props.body - Permission creation payload including code, name,
 *   description, scope_type, status
 * @returns Newly created IHealthcarePlatformPermission object
 * @throws {Error} If a permission with the same code and scope_type is already
 *   active (deleted_at == null)
 */
export async function posthealthcarePlatformSystemAdminPermissions(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformPermission.ICreate;
}): Promise<IHealthcarePlatformPermission> {
  const { body } = props;
  // Uniqueness check for code + scope among active permissions
  const duplicate =
    await MyGlobal.prisma.healthcare_platform_permissions.findFirst({
      where: {
        code: body.code,
        scope_type: body.scope_type,
        deleted_at: null,
      },
    });
  if (duplicate) {
    throw new Error(
      `Permission with code '${body.code}' and scope '${body.scope_type}' already exists.`,
    );
  }

  // Now timestamps in ISO8601 UTC for all date fields
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  // Generate UUID for id with strong type
  const id: string & tags.Format<"uuid"> = v4();

  // Create the permission
  const created = await MyGlobal.prisma.healthcare_platform_permissions.create({
    data: {
      id: id,
      code: body.code,
      name: body.name,
      description: body.description,
      scope_type: body.scope_type,
      status: body.status,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Compose return type, converting all date/time fields using toISOStringSafe for branding
  return {
    id: created.id,
    code: created.code,
    name: created.name,
    description: created.description,
    scope_type: created.scope_type,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== undefined && created.deleted_at !== null
        ? toISOStringSafe(created.deleted_at)
        : null,
  };
}
