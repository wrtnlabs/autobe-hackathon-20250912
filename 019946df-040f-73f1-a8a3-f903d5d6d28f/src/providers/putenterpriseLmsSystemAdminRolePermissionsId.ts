import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsRolePermission";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update a role permission by ID.
 *
 * This operation updates an existing role permission entry identified by its
 * unique ID. It accepts updates to any combination of role_id, permission_key,
 * description, and is_allowed fields. Only users with systemAdmin role are
 * authorized to call this function.
 *
 * @param props - Object containing systemAdmin payload, the target permission
 *   ID, and update body
 * @returns The updated IEnterpriseLmsRolePermission entity
 * @throws {Error} If update fails or the permission does not exist
 */
export async function putenterpriseLmsSystemAdminRolePermissionsId(props: {
  systemAdmin: SystemadminPayload;
  id: string & tags.Format<"uuid">;
  body: IEnterpriseLmsRolePermission.IUpdate;
}): Promise<IEnterpriseLmsRolePermission> {
  const { systemAdmin, id, body } = props;

  const updated = await MyGlobal.prisma.enterprise_lms_role_permissions.update({
    where: { id },
    data: {
      role_id: body.role_id ?? undefined,
      permission_key: body.permission_key ?? undefined,
      description:
        body.description === null ? null : (body.description ?? undefined),
      is_allowed: body.is_allowed ?? undefined,
    },
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    role_id: updated.role_id as string & tags.Format<"uuid">,
    permission_key: updated.permission_key,
    description: updated.description ?? null,
    is_allowed: updated.is_allowed,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
