import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerOauthClient } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthClient";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Retrieve detailed information of a specific OAuth client by its unique
 * identifier.
 *
 * This function is restricted to authenticated developers.
 *
 * @param props - Object containing authenticated developer info and OAuth
 *   client ID
 * @param props.developer - Authenticated developer payload
 * @param props.id - UUID format string of the OAuth client to retrieve
 * @returns Promise resolving to the OAuth client data conforming to
 *   IOauthServerOauthClient
 * @throws Throws if the OAuth client with given ID does not exist
 */
export async function getoauthServerDeveloperOauthClientsId(props: {
  developer: DeveloperPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IOauthServerOauthClient> {
  const { developer, id } = props;

  // Authorization handled externally via decorator

  const record =
    await MyGlobal.prisma.oauth_server_oauth_clients.findUniqueOrThrow({
      where: { id },
    });

  return {
    id: record.id,
    client_id: record.client_id,
    client_secret: record.client_secret,
    redirect_uri: record.redirect_uri,
    logo_uri: record.logo_uri ?? undefined,
    is_trusted: record.is_trusted,
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
