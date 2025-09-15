import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft delete an OAuth client by setting its deleted_at timestamp.
 *
 * This operation marks the OAuth client identified by its UUID as deleted
 * without physically removing it from the database, allowing for soft delete
 * semantics.
 *
 * Only authenticated admin users can perform this operation.
 *
 * @param props - Object containing admin payload and the target OAuth client
 *   ID.
 * @param props.admin - Authenticated admin payload performing the deletion.
 * @param props.id - UUID of the OAuth client to soft delete.
 * @returns Void
 * @throws {Error} When the OAuth client does not exist or is already deleted.
 */
export async function deleteoauthServerAdminOauthClientsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, id } = props;

  // Verify client existence (active)
  const client = await MyGlobal.prisma.oauth_server_oauth_clients.findFirst({
    where: { id, deleted_at: null },
  });

  if (client === null) {
    throw new Error("OAuth client not found");
  }

  // Soft delete timestamp
  const deletedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );

  await MyGlobal.prisma.oauth_server_oauth_clients.update({
    where: { id },
    data: { deleted_at: deletedAt },
  });

  return;
}
