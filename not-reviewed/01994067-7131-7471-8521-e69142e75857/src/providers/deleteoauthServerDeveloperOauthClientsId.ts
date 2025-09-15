import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Soft delete an OAuth client by setting its deletion timestamp.
 *
 * Marks the client inactive, excluding it from OAuth flows without permanent
 * deletion. Only authorized developers may perform this operation.
 *
 * @param props - Request properties
 * @param props.developer - The authenticated developer performing the deletion
 * @param props.id - UUID of the OAuth client to delete
 * @throws {Error} If the client does not exist or has been already deleted
 */
export async function deleteoauthServerDeveloperOauthClientsId(props: {
  developer: DeveloperPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { developer, id } = props;

  // Verify that the OAuth client exists and is not already deleted
  await MyGlobal.prisma.oauth_server_oauth_clients.findFirstOrThrow({
    where: { id, deleted_at: null },
  });

  // Soft delete by setting deleted_at to current timestamp
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  await MyGlobal.prisma.oauth_server_oauth_clients.update({
    where: { id },
    data: { deleted_at: now },
  });
}
