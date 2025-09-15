import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Delete a client secret regeneration record
 *
 * This operation permanently removes a secret regeneration record identified by
 * the given UUID from the OAuth server's admin domain.
 *
 * Authorization:
 *
 * - Only admin users can execute this operation.
 *
 * @param props - Object containing admin payload and UUID of the record to
 *   delete.
 * @param props.admin - The authenticated admin performing the deletion.
 * @param props.id - UUID of the client secret regeneration record.
 * @throws {Error} If the specified record does not exist.
 */
export async function deleteoauthServerAdminOauthServerClientSecretRegenerationsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, id } = props;
  await MyGlobal.prisma.oauth_server_client_secret_regenerations.delete({
    where: { id },
  });
}
