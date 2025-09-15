import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerOauthClient } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthClient";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Create a new OAuth client.
 *
 * Creates a new OAuth client in the system with provided credentials and
 * metadata. Generates new UUID and timestamps, stores data in
 * 'oauth_server_oauth_clients' table. Only accessible by authorized
 * developers.
 *
 * @param props - Request properties
 * @param props.developer - Authenticated developer making the request
 * @param props.body - OAuth client creation data
 * @returns The newly created OAuth client entity
 * @throws {Error} If database insertion fails or constraints not met
 */
export async function postoauthServerDeveloperOauthClients(props: {
  developer: DeveloperPayload;
  body: IOauthServerOauthClient.ICreate;
}): Promise<IOauthServerOauthClient> {
  const { developer, body } = props;

  const newId = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.oauth_server_oauth_clients.create({
    data: {
      id: newId,
      client_id: body.client_id,
      client_secret: body.client_secret,
      redirect_uri: body.redirect_uri,
      logo_uri: body.logo_uri ?? null,
      is_trusted: body.is_trusted,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    client_id: created.client_id,
    client_secret: created.client_secret,
    redirect_uri: created.redirect_uri,
    logo_uri: created.logo_uri ?? null,
    is_trusted: created.is_trusted,
    deleted_at: created.deleted_at ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
