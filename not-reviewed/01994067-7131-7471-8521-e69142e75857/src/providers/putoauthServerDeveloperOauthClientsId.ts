import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerOauthClient } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthClient";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Update an existing OAuth client's credentials and metadata by specifying its
 * unique ID.
 *
 * Allows developers to modify client secret, redirect URI, logo URI, and trust
 * status.
 *
 * Soft deletion status is managed separately and not modifiable through this
 * operation.
 *
 * @param props - Object containing the authenticated developer, OAuth client ID
 *   to update, and update data
 * @param props.developer - Authenticated developer performing the update
 * @param props.id - Unique identifier of the OAuth client to update
 * @param props.body - Partial update data for client_secret, redirect_uri,
 *   logo_uri, and is_trusted
 * @returns Updated OAuth client entity with all fields populated
 * @throws Will throw if the OAuth client does not exist
 */
export async function putoauthServerDeveloperOauthClientsId(props: {
  developer: DeveloperPayload;
  id: string & tags.Format<"uuid">;
  body: IOauthServerOauthClient.IUpdate;
}): Promise<IOauthServerOauthClient> {
  const { developer, id, body } = props;

  // Verify the client exists; throws if not
  const client =
    await MyGlobal.prisma.oauth_server_oauth_clients.findUniqueOrThrow({
      where: { id },
    });

  // Update allowed fields
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

  // Return updated client with all fields and properly converted dates
  return {
    id: updated.id,
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
