import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerScope } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerScope";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new OAuth scope.
 *
 * This operation creates a new OAuth scope entry with a unique code and
 * description. Only administrators can perform this operation to extend OAuth
 * permissions.
 *
 * @param props - Object containing the admin payload and scope creation data.
 * @param props.admin - The authenticated admin performing the operation.
 * @param props.body - The scope creation information including code and
 *   description.
 * @returns The newly created OAuth scope with all fields populated.
 * @throws {Error} When a scope with the same code already exists, or on
 *   database errors.
 */
export async function postoauthServerAdminScopes(props: {
  admin: AdminPayload;
  body: IOauthServerScope.ICreate;
}): Promise<IOauthServerScope> {
  const { admin, body } = props;

  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.oauth_server_scopes.create({
    data: {
      id,
      code: body.code,
      description: body.description,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    code: created.code,
    description: created.description,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
