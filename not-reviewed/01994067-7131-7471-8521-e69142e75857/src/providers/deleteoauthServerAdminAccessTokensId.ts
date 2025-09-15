import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Delete an OAuth access token by ID.
 *
 * Permanently delete an OAuth access token from the system by its unique ID.
 * This operation performs a hard delete, removing the token record entirely and
 * irreversibly.
 *
 * Authorization checks ensure only administrators can perform this operation.
 *
 * @param props - Object containing admin authentication payload and the ID of
 *   the token to delete.
 * @param props.admin - The authenticated admin performing the deletion.
 * @param props.id - UUID of the OAuth access token to delete.
 * @throws {Error} When the token does not exist.
 */
export async function deleteoauthServerAdminAccessTokensId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify token exists
  await MyGlobal.prisma.oauth_server_access_tokens.findUniqueOrThrow({
    where: { id: props.id },
  });

  // Perform hard delete
  await MyGlobal.prisma.oauth_server_access_tokens.delete({
    where: { id: props.id },
  });
}
