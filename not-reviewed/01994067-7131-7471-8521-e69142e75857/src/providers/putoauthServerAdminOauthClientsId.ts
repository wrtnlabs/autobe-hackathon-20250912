import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerOauthClient } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthClient";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing OAuth client identified by its UUID.
 *
 * This function allows authorized admins to modify mutable fields including
 * client_secret, redirect_uri, logo_uri, and is_trusted status.
 *
 * Soft deletion timestamp and client_id are immutable via this operation.
 *
 * The updated_at field is set to the current timestamp during update.
 *
 * @param props - The function parameters including admin payload, client ID,
 *   and update data.
 * @returns The full updated OAuth client entity adhering to
 *   IOauthServerOauthClient.
 * @throws Error if the client with specified ID does not exist.
 */
export async function putoauthServerAdminOauthClientsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IOauthServerOauthClient.IUpdate;
}): Promise<IOauthServerOauthClient> {
  const { admin, id, body } = props;

  // Verify existence
  const client =
    await MyGlobal.prisma.oauth_server_oauth_clients.findUniqueOrThrow({
      where: { id },
    });

  // Update mutable fields
  const updated = await MyGlobal.prisma.oauth_server_oauth_clients.update({
    where: { id },
    data: {
      client_secret: body.client_secret ?? undefined,
      redirect_uri: body.redirect_uri ?? undefined,
      logo_uri: body.logo_uri ?? undefined,
      is_trusted: body.is_trusted ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return with correct typing and date string conversion
  return {
    id: updated.id as string & tags.Format<"uuid">,
    client_id: updated.client_id,
    client_secret: updated.client_secret,
    redirect_uri: updated.redirect_uri,
    logo_uri: updated.logo_uri ?? null,
    is_trusted: updated.is_trusted,
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
