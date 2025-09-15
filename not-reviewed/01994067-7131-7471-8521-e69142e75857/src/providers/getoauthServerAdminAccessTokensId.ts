import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAccessToken";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get a specific OAuth access token by ID
 *
 * This function retrieves detailed information of a single OAuth access token
 * by its unique identifier. It returns comprehensive details including the
 * token string, scopes granted, expiration timestamp, and references to the
 * oauth client and optional authorization code.
 *
 * Authorization is enforced externally; the presence of an admin payload
 * ensures only authorized administrators can invoke this.
 *
 * @param props - Object containing admin authentication and the token ID
 * @param props.admin - Authenticated admin performing the request
 * @param props.id - UUID of the OAuth access token to retrieve
 * @returns The OAuth access token entity matching the ID
 * @throws {Error} Throws if the access token does not exist
 */
export async function getoauthServerAdminAccessTokensId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IOauthServerAccessToken> {
  const { id } = props;

  const record =
    await MyGlobal.prisma.oauth_server_access_tokens.findUniqueOrThrow({
      where: { id },
    });

  return {
    id: record.id,
    oauth_client_id: record.oauth_client_id,
    authorization_code_id: record.authorization_code_id ?? null,
    token: record.token,
    scope: record.scope,
    expires_at: toISOStringSafe(record.expires_at),
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
