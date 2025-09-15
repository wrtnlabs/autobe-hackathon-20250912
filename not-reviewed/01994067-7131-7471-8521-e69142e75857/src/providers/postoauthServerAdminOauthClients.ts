import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerOauthClient } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthClient";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new OAuth client by providing client credentials and metadata.
 *
 * This operation is restricted to authorized administrators.
 *
 * The client_id must be unique and redirect_uri valid. The is_trusted flag
 * determines if automatic consent is granted during OAuth flows.
 *
 * @param props - Object containing admin payload and client creation data
 * @param props.admin - Authenticated admin user performing the creation
 * @param props.body - Client creation input data conforming to
 *   IOauthServerOauthClient.ICreate
 * @returns The newly created OAuth client entity
 * @throws {Error} When the client_id already exists
 */
export async function postoauthServerAdminOauthClients(props: {
  admin: AdminPayload;
  body: IOauthServerOauthClient.ICreate;
}): Promise<IOauthServerOauthClient> {
  const { admin, body } = props;

  const existing = await MyGlobal.prisma.oauth_server_oauth_clients.findFirst({
    where: { client_id: body.client_id, deleted_at: null },
    select: { id: true },
  });
  if (existing) {
    throw new Error(
      `OAuth client with client_id '${body.client_id}' already exists.`,
    );
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const id: string & tags.Format<"uuid"> = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.oauth_server_oauth_clients.create({
    data: {
      id,
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
    logo_uri: created.logo_uri ?? undefined,
    is_trusted: created.is_trusted,
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
