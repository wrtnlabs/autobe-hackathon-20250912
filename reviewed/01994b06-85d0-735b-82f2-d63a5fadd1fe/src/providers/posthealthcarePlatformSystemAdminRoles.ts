import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRole";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new RBAC role (platform/org/department) in healthcarePlatform.
 *
 * This endpoint creates a new role in the healthcarePlatform, scoped at
 * platform, organization, or department, defining a boundary for permission
 * allocation, workflow access, and RBAC configuration. It enforces uniqueness
 * of code within its scope, manages audit-critical metadata, and provides the
 * root for user assignment and security enforcement. Only system administrators
 * may perform this operation at the platform level.
 *
 * @param props - Request context
 * @param props.systemAdmin - Authenticated system admin payload, required for
 *   authorization
 * @param props.body - New role properties: code, name, scope_type, status
 * @returns Newly created IHealthcarePlatformRole entity with system-managed id,
 *   timestamps, and meta fields
 * @throws {Error} If a role already exists for the same code and scope_type
 *   (uniqueness is strictly enforced)
 */
export async function posthealthcarePlatformSystemAdminRoles(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformRole.ICreate;
}): Promise<IHealthcarePlatformRole> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Enforce uniqueness: code + scope_type must be unique in the system
  const alreadyExists =
    await MyGlobal.prisma.healthcare_platform_roles.findFirst({
      where: {
        code: props.body.code,
        scope_type: props.body.scope_type,
      },
    });
  if (alreadyExists) {
    throw new Error("Role with this code and scope_type already exists");
  }

  // Create the new role
  const created = await MyGlobal.prisma.healthcare_platform_roles.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      code: props.body.code,
      name: props.body.name,
      scope_type: props.body.scope_type,
      status: props.body.status,
      created_at: now,
      updated_at: now,
      // deleted_at is omitted; defaults to null
    },
  });

  // Return mapped DTO (always use toISOStringSafe for timestamps)
  return {
    id: created.id,
    code: created.code,
    name: created.name,
    scope_type: created.scope_type,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
