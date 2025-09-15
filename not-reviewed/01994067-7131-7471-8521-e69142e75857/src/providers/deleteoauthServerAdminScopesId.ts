import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft delete an OAuth scope by ID.
 *
 * Marks the scope record's deleted_at field with the current timestamp. Only
 * admin users can perform this operation.
 *
 * Throws an error if the scope does not exist or is already deleted.
 *
 * @param props - The input parameters including admin auth and scope ID
 * @param props.admin - Authenticated administrator performing the deletion
 * @param props.id - The UUID of the OAuth scope to soft delete
 * @throws {Error} When the OAuth scope is not found or already deleted
 */
export async function deleteoauthServerAdminScopesId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, id } = props;

  const scope = await MyGlobal.prisma.oauth_server_scopes.findFirst({
    where: {
      id,
      deleted_at: null,
    },
  });

  if (!scope) {
    throw new Error("Scope not found or already deleted");
  }

  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.oauth_server_scopes.update({
    where: { id },
    data: { deleted_at: now },
  });
}
