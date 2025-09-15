import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerScope } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerScope";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing OAuth scope by ID
 *
 * This operation allows an admin user to partially or fully update an OAuth
 * scope's code and description. It ensures the uniqueness of the scope code is
 * maintained across all scopes.
 *
 * @param props - Object containing admin authentication, target scope ID, and
 *   update payload
 * @param props.admin - Authenticated admin performing the update
 * @param props.id - UUID of the OAuth scope to be updated
 * @param props.body - Partial update data for the OAuth scope (code and/or
 *   description)
 * @returns The updated OAuth scope including timestamps and soft delete status
 * @throws {Error} When the updated scope code is already used by another scope
 * @throws {Error} When the target scope ID does not exist
 */
export async function putoauthServerAdminScopesId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IOauthServerScope.IUpdate;
}): Promise<IOauthServerScope> {
  const { admin, id, body } = props;

  const existingScope =
    await MyGlobal.prisma.oauth_server_scopes.findUniqueOrThrow({
      where: { id },
    });

  if (body.code !== undefined && body.code !== existingScope.code) {
    const duplicate = await MyGlobal.prisma.oauth_server_scopes.findFirst({
      where: { code: body.code, id: { not: id } },
    });

    if (duplicate !== null) {
      throw new Error("Duplicate scope code");
    }
  }

  const updatedAt = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.oauth_server_scopes.update({
    where: { id },
    data: {
      code: body.code ?? undefined,
      description: body.description ?? undefined,
      updated_at: updatedAt,
    },
  });

  return {
    id: updated.id,
    code: updated.code,
    description: updated.description,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
