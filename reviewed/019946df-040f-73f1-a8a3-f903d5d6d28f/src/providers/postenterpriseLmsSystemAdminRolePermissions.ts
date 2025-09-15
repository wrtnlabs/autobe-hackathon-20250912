import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsRolePermission";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new role permission for a specified system admin role.
 *
 * This operation inserts a record into the enterprise_lms_role_permissions
 * table, specifying the permission key, allowed status, and optional
 * description. It returns the created permission entry including its unique ID
 * and timestamps.
 *
 * Only users with the systemAdmin role are authorized to perform this
 * operation.
 *
 * @param props - Object containing authenticated systemAdmin and request body
 * @param props.systemAdmin - The authenticated systemAdmin performing the
 *   operation
 * @param props.body - Request body containing role permission creation data
 * @returns The created role permission record
 * @throws {Error} Throws if the creation fails (e.g., duplicate key)
 */
export async function postenterpriseLmsSystemAdminRolePermissions(props: {
  systemAdmin: SystemadminPayload;
  body: IEnterpriseLmsRolePermission.ICreate;
}): Promise<IEnterpriseLmsRolePermission> {
  const { body } = props;
  const now = toISOStringSafe(new Date());
  const newId = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.enterprise_lms_role_permissions.create({
    data: {
      id: newId,
      role_id: body.role_id,
      permission_key: body.permission_key,
      description: body.description ?? null,
      is_allowed: body.is_allowed,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    role_id: created.role_id,
    permission_key: created.permission_key,
    description: created.description ?? null,
    is_allowed: created.is_allowed,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
