import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerOauthClient } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthClient";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve detailed information of a specific OAuth client by its unique
 * identifier.
 *
 * This endpoint allows authorized personnel such as developers and admins to
 * access client metadata necessary for management and auditing purposes.
 *
 * Access control is enforced via the presence of an authenticated admin
 * payload.
 *
 * @param props - Object containing the admin payload and OAuth client ID.
 * @param props.admin - Authenticated admin user payload.
 * @param props.id - Unique identifier (UUID) of the OAuth client to retrieve.
 * @returns Detailed information of the specified OAuth client.
 * @throws {Error} If the OAuth client with the specified ID does not exist.
 */
export async function getoauthServerAdminOauthClientsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IOauthServerOauthClient> {
  const { admin, id } = props;

  const record =
    await MyGlobal.prisma.oauth_server_oauth_clients.findUniqueOrThrow({
      where: { id },
    });

  return {
    id: record.id,
    client_id: record.client_id,
    client_secret: record.client_secret,
    redirect_uri: record.redirect_uri,
    logo_uri: record.logo_uri ?? null,
    is_trusted: record.is_trusted,
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
