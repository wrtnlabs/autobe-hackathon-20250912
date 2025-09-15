import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Delete an ID token record permanently from the oauth_server_id_tokens table.
 *
 * This operation performs a hard delete that completely removes the record
 * identified by the unique ID. Only users with admin role are authorized to
 * perform this action.
 *
 * @param props - Object containing admin authentication payload and the ID
 *   token's UUID to delete
 * @param props.admin - The authenticated admin user performing the deletion
 * @param props.id - The UUID string identifying the ID token to be deleted
 * @throws {Error} When the record does not exist or deletion fails
 */
export async function deleteoauthServerAdminIdTokensId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.oauth_server_id_tokens.delete({
    where: { id: props.id },
  });
}
